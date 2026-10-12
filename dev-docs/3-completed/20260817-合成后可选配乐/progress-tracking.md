# 进度跟踪

- [x] 梳理 `VideoComposeService` 合成流程与临时目录生命周期，确定配乐步骤挂载点。
- [x] 实现 `SoniloAudioClient`（OkHttp，异步任务提交 + 轮询 + 结果下载）。
- [x] 实现 `EpisodeBgmService`（时长预检、音轨持久化、ffmpeg 混音命令构建与执行）。
- [x] `VideoComposeService` 挂入可选配乐步骤，任务流透传进度与结果消息。
- [x] 分镜集实体、Flyway 迁移与 `application.yaml` 配置项。
- [x] 单元测试与既有测试回归。
- [x] 按维护者 review 返工：密钥与地址从 `application.yaml` 迁到 `platform=sonilo` 的 API 配置（`ApiConfigService` 动态读取、沿用出站代理），`SoniloBgmProperties` 收敛为仅含调优参数的 `EpisodeBgmProperties`；前端 API 配置对话框增加 Sonilo 接入类型。
