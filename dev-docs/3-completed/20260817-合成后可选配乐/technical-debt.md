# 技术债务

1. 配乐步骤失败时降级为无配乐成片（原因写入 `bgm_error_msg` 与任务流），这是对外部付费接口的有意产品取舍，不是兼容性 fallback；如维护者希望失败即整体失败，改动集中在 `VideoComposeService.doCompose` 一处。
2. 音效开启但生成失败时同样只记录原因、保留已生成的配乐；后续可考虑拆分独立的音效状态字段。
3. `EpisodeBgmService` 内的 ffprobe/ffmpeg 进程辅助方法与 `VideoComposeService` 存在少量重复，为保持本次改动纯增量未抽公共类；后续如出现第三处使用方可抽 `FfmpegRunner`。
4. 配乐的调优参数（`music-prompt`、`music-volume`、`sfx-enabled`、轮询与超时）仍在 `video.compose.bgm.*` 中静态配置，与 `ffmpeg-path` 同级；接入与密钥已改为 API 配置动态维护。如需运行时调整这些参数，可迁到 `SystemConfig` 并补设置页，本次未做以控制改动面。
5. Sonilo 只有音频能力，不实现面向对话模型的 `AiProvider` 接口，与 ComfyUI 一样按平台标识走 `ApiConfigService`；`AiProviderRegistry` 不会解析该平台，前端已隐藏该配置的远程模型拉取入口。
