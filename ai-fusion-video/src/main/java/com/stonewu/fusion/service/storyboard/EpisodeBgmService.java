package com.stonewu.fusion.service.storyboard;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import com.stonewu.fusion.common.BusinessException;
import com.stonewu.fusion.config.EpisodeBgmProperties;
import com.stonewu.fusion.entity.ai.ApiConfig;
import com.stonewu.fusion.service.ai.ApiConfigService;
import com.stonewu.fusion.service.ai.sonilo.SoniloAudioClient;
import com.stonewu.fusion.service.ai.sonilo.SoniloAudioTrack;
import com.stonewu.fusion.service.storage.MediaStorageService;
import com.stonewu.fusion.service.storyboard.dto.EpisodeBgmOutcome;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * 合成后配乐服务。
 * <p>
 * 开关与接入全部动态维护：存在启用的、平台为 {@code sonilo} 的 API 配置即开启，
 * 禁用或删除即关闭；密钥、地址与出站代理都从该配置读取，不进 application.yaml。
 * <p>
 * 在本集视频拼接完成后、持久化之前执行：把成片交给 Sonilo 按画面内容生成配乐
 * （时长与成片自动对齐，无提示词也可用；可选同时生成音效音轨），
 * 下载音轨并持久化留档，再用 ffmpeg 把音轨混入成片（视频流零转码）。
 * <p>
 * 配乐音乐自带授权、可商用（以 Sonilo 条款为准）；单独的音效音轨为免版税。
 */
@Service
@Slf4j
public class EpisodeBgmService {

    /** 配乐接口的视频时长上限（秒） */
    public static final int MUSIC_MAX_SECONDS = 360;

    /** 音效接口的视频时长上限（秒） */
    public static final int SFX_MAX_SECONDS = 180;

    private static final int MUX_TIMEOUT_MINUTES = 15;
    private static final int PROBE_TIMEOUT_SECONDS = 30;

    private final EpisodeBgmProperties properties;
    private final SoniloAudioClient soniloAudioClient;
    private final MediaStorageService mediaStorageService;
    private final ApiConfigService apiConfigService;

    @Value("${video.compose.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    @Value("${video.compose.ffprobe-path:ffprobe}")
    private String ffprobePath;

    public EpisodeBgmService(EpisodeBgmProperties properties,
                             SoniloAudioClient soniloAudioClient,
                             MediaStorageService mediaStorageService,
                             ApiConfigService apiConfigService) {
        this.properties = properties;
        this.soniloAudioClient = soniloAudioClient;
        this.mediaStorageService = mediaStorageService;
        this.apiConfigService = apiConfigService;
    }

    /**
     * 解析当前生效的 Sonilo 接入配置。
     *
     * @return 启用的 platform=sonilo API 配置；没有则返回 null，表示本次合成不做配乐。
     *         同时存在多条时取 id 最小的一条并记录告警。
     */
    @Cacheable(value = "episodeBgmConfig", key = "'enabled'", unless = "#result == null")
    public ApiConfig resolveApiConfig() {
        List<ApiConfig> configs = apiConfigService.getListByPlatform(SoniloAudioClient.PLATFORM);
        if (configs == null || configs.isEmpty()) {
            return null;
        }
        ApiConfig selected = configs.stream()
                .min(Comparator.comparing(ApiConfig::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(configs.get(0));
        if (configs.size() > 1) {
            log.warn("[EpisodeBgm] 存在 {} 条启用的 Sonilo API 配置，本次使用 id={}（{}）",
                    configs.size(), selected.getId(), selected.getName());
        }
        return selected;
    }

    /**
     * 对合成完成的成片执行配乐。
     *
     * @param apiConfig     {@link #resolveApiConfig()} 得到的 Sonilo 接入配置
     * @param composedVideo 拼接完成的本地成片文件
     * @param workDir       本次合成的临时目录（音轨与混音产物都写在这里，随合成流程统一清理）
     * @param progress      进度回调，透传到任务流
     * @return 配乐结果；配乐失败时抛出异常，由调用方决定是否降级
     */
    public EpisodeBgmOutcome apply(ApiConfig apiConfig, Path composedVideo, Path workDir, Consumer<String> progress) {
        SoniloAudioClient.requireApiKey(apiConfig);

        double durationSeconds = probeDurationSeconds(composedVideo);
        String musicSkipReason = musicSkipReason(durationSeconds);
        if (musicSkipReason != null) {
            return EpisodeBgmOutcome.skipped(musicSkipReason);
        }
        boolean hasOriginalAudio = hasAudioStream(composedVideo);

        progress.accept("配乐生成中：正在上传成片到 Sonilo…");
        String musicTaskId = soniloAudioClient.submitMusicTask(apiConfig, composedVideo, properties.getMusicPrompt());
        progress.accept("配乐任务已受理（task_id: " + musicTaskId + "），等待生成…");
        JSONObject musicTask = soniloAudioClient.awaitTask(apiConfig, musicTaskId);
        SoniloAudioTrack musicTrack = soniloAudioClient.extractPrimaryTrack(musicTask, musicTaskId);

        Path musicFile = workDir.resolve("bgm_music" + audioExtension(musicTrack.url()));
        soniloAudioClient.downloadAudio(apiConfig, musicTrack.url(), musicFile);
        String musicStoredUrl = mediaStorageService.storeFile(
                musicFile, "audio/bgm", trimDot(audioExtension(musicTrack.url())));

        Path sfxFile = null;
        String sfxStoredUrl = null;
        String skippedReason = null;
        if (properties.isSfxEnabled()) {
            if (sfxAllowed(durationSeconds)) {
                // 音效是可选加分项：失败只记录原因，保留已生成的配乐
                try {
                    progress.accept("音效生成中：已提交 Sonilo 音效任务…");
                    String sfxTaskId = soniloAudioClient.submitSfxTask(apiConfig, composedVideo, null);
                    JSONObject sfxTask = soniloAudioClient.awaitTask(apiConfig, sfxTaskId);
                    SoniloAudioTrack sfxTrack = soniloAudioClient.extractPrimaryTrack(sfxTask, sfxTaskId);
                    sfxFile = workDir.resolve("bgm_sfx" + audioExtension(sfxTrack.url()));
                    soniloAudioClient.downloadAudio(apiConfig, sfxTrack.url(), sfxFile);
                    sfxStoredUrl = mediaStorageService.storeFile(
                            sfxFile, "audio/bgm", trimDot(audioExtension(sfxTrack.url())));
                } catch (Exception e) {
                    sfxFile = null;
                    sfxStoredUrl = null;
                    skippedReason = "音效生成失败：" + e.getMessage();
                    log.error("[EpisodeBgm] 音效生成失败，本次仅合入配乐", e);
                    progress.accept("音效生成失败：" + e.getMessage() + "，本次仅合入配乐");
                }
            } else {
                skippedReason = "本集时长超过音效上限 " + SFX_MAX_SECONDS / 60 + " 分钟，已跳过音效";
                progress.accept("本集时长超过音效上限 " + SFX_MAX_SECONDS / 60 + " 分钟，本次仅生成配乐");
            }
        }

        progress.accept("配乐已生成，正在混入成片…");
        Path scoredVideo = workDir.resolve("output_bgm.mp4");
        List<String> command = buildMixCommand(
                composedVideo, musicFile, sfxFile, hasOriginalAudio, durationSeconds, scoredVideo);
        if (!runFfmpeg(command)) {
            throw new BusinessException("配乐混音失败（ffmpeg），本集视频保持无配乐版本");
        }

        return new EpisodeBgmOutcome(
                scoredVideo,
                musicTaskId,
                musicStoredUrl,
                sfxStoredUrl,
                skippedReason);
    }

    /**
     * 配乐前置校验。返回非 null 表示跳过配乐的原因。
     * 无法确定视频时长时不提交付费生成任务。
     */
    String musicSkipReason(double durationSeconds) {
        if (!Double.isFinite(durationSeconds) || durationSeconds <= 0) {
            return "无法确定成片视频时长，已跳过配乐";
        }
        if (durationSeconds > MUSIC_MAX_SECONDS) {
            return "本集时长超过配乐上限 " + MUSIC_MAX_SECONDS / 60 + " 分钟，已跳过配乐";
        }
        return null;
    }

    boolean sfxAllowed(double durationSeconds) {
        return durationSeconds <= SFX_MAX_SECONDS;
    }

    /**
     * 构建混音命令。视频流一律 {@code -c:v copy} 零转码：
     * <ul>
     * <li>按视频流时长输出，短音轨补静音，长音轨裁剪</li>
     * <li>配乐按配置调整音量，再与原声 / 音效混合</li>
     * </ul>
     */
    List<String> buildMixCommand(Path video, Path music, Path sfx, boolean hasOriginalAudio,
                                 double durationSeconds, Path output) {
        if (!Double.isFinite(durationSeconds) || durationSeconds <= 0) {
            throw new BusinessException("混音必须提供有效的视频时长");
        }
        List<String> command = new ArrayList<>();
        command.add(getFfmpegExecutable());
        command.add("-y");
        command.add("-i");
        command.add(video.toString());
        command.add("-i");
        command.add(music.toString());
        if (sfx != null) {
            command.add("-i");
            command.add(sfx.toString());
        }

        if (!hasOriginalAudio && sfx == null) {
            command.add("-filter_complex");
            command.add("[1:a]volume=" + String.format(Locale.ROOT, "%.2f", properties.getMusicVolume())
                    + ",apad[aout]");
        } else {
            StringBuilder filter = new StringBuilder();
            filter.append("[1:a]volume=")
                    .append(String.format(Locale.ROOT, "%.2f", properties.getMusicVolume()))
                    .append("[bgm];");
            int mixInputs = 1;
            if (hasOriginalAudio) {
                filter.append("[0:a]");
                mixInputs++;
            }
            filter.append("[bgm]");
            if (sfx != null) {
                filter.append("[2:a]");
                mixInputs++;
            }
            filter.append("amix=inputs=").append(mixInputs)
                    .append(":duration=longest:normalize=0,apad[aout]");
            command.add("-filter_complex");
            command.add(filter.toString());
        }

        command.add("-map");
        command.add("0:v:0");
        command.add("-map");
        command.add("[aout]");
        command.add("-c:v");
        command.add("copy");
        command.add("-c:a");
        command.add("aac");
        command.add("-t");
        command.add(String.format(Locale.ROOT, "%.3f", durationSeconds));
        command.add(output.toString());
        return command;
    }

    /**
     * 读取视频流时长；探测失败时显式跳过可选配乐。
     */
    private double probeDurationSeconds(Path video) {
        List<String> command = List.of(
                getFfprobeExecutable(), "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=duration",
                "-of", "csv=p=0",
                video.toString());
        String output = runForOutput(command, PROBE_TIMEOUT_SECONDS);
        if (output == null) {
            return 0;
        }
        try {
            return Double.parseDouble(output.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private boolean hasAudioStream(Path video) {
        List<String> command = List.of(
                getFfprobeExecutable(), "-v", "error",
                "-select_streams", "a",
                "-show_entries", "stream=index",
                "-of", "csv=p=0",
                video.toString());
        String output = runForOutput(command, PROBE_TIMEOUT_SECONDS);
        if (output == null) throw new BusinessException("无法检测成片原声，已停止配乐以保留原视频");
        return StrUtil.isNotBlank(output.trim());
    }

    private boolean runFfmpeg(List<String> command) {
        log.info("[EpisodeBgm] 执行混音: {}", String.join(" ", command));
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        try {
            Process process = processBuilder.start();
            StringBuilder tail = new StringBuilder();
            Thread reader = new Thread(() -> drainOutput(process.getInputStream(), tail), "bgm-mux-output");
            reader.setDaemon(true);
            reader.start();
            boolean done = process.waitFor(MUX_TIMEOUT_MINUTES, TimeUnit.MINUTES);
            if (!done) {
                process.destroyForcibly();
                log.error("[EpisodeBgm] 混音超时，已强制终止");
                return false;
            }
            reader.join(TimeUnit.SECONDS.toMillis(5));
            if (process.exitValue() != 0) {
                log.error("[EpisodeBgm] 混音退出码非 0: {}。最近输出: {}", process.exitValue(), tail);
                return false;
            }
            return true;
        } catch (IOException e) {
            log.error("[EpisodeBgm] 混音进程启动失败", e);
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private String runForOutput(List<String> command, int timeoutSeconds) {
        try {
            Process process = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .start();
            boolean done = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!done) {
                process.destroyForcibly();
                return null;
            }
            String output;
            try (InputStream in = process.getInputStream()) {
                output = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            return process.exitValue() == 0 ? output : null;
        } catch (IOException e) {
            log.warn("[EpisodeBgm] ffprobe 不可用或执行失败: {}", e.getMessage());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    private void drainOutput(InputStream inputStream, StringBuilder tail) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                synchronized (tail) {
                    if (!tail.isEmpty()) {
                        tail.append(System.lineSeparator());
                    }
                    tail.append(line);
                    int maxLength = 4000;
                    if (tail.length() > maxLength) {
                        tail.delete(0, tail.length() - maxLength);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("[EpisodeBgm] 读取混音输出失败", e);
        }
    }

    private String audioExtension(String url) {
        String pathPart = url.split("\\?", 2)[0];
        int dot = pathPart.lastIndexOf('.');
        if (dot >= 0) {
            String ext = pathPart.substring(dot).toLowerCase(Locale.ROOT);
            if (List.of(".m4a", ".wav", ".mp3", ".aac", ".flac").contains(ext)) {
                return ext;
            }
        }
        return ".m4a";
    }

    private String trimDot(String extension) {
        return extension.startsWith(".") ? extension.substring(1) : extension;
    }

    private String getFfmpegExecutable() {
        return StrUtil.isNotBlank(ffmpegPath) ? ffmpegPath.trim() : "ffmpeg";
    }

    private String getFfprobeExecutable() {
        return StrUtil.isNotBlank(ffprobePath) ? ffprobePath.trim() : "ffprobe";
    }
}
