package com.stonewu.fusion.service.storyboard.dto;

import java.nio.file.Path;

/**
 * 合成后配乐步骤的结果。
 *
 * @param scoredVideoFile 已混入配乐的成片文件；为 null 表示本次跳过配乐（如超时长上限）
 * @param musicTaskId     Sonilo 配乐任务ID（授权记录查询凭据）
 * @param musicAudioUrl   配乐音轨持久化后的URL
 * @param sfxAudioUrl     音效音轨持久化后的URL（未开启或跳过时为 null）
 * @param skippedReason   跳过配乐或音效的原因；为 null 表示所有启用步骤均成功
 */
public record EpisodeBgmOutcome(
        Path scoredVideoFile,
        String musicTaskId,
        String musicAudioUrl,
        String sfxAudioUrl,
        String skippedReason) {

    public static EpisodeBgmOutcome skipped(String reason) {
        return new EpisodeBgmOutcome(null, null, null, null, reason);
    }
}
