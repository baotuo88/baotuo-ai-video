# 验证限制与边界

- 附件仅保存在当前浏览器页面的内存中，不将 Base64 大文件持久化到 Cookie/localStorage；刷新或关闭页面会清空附件，文字草稿沿用原有持久化。
- Docker Hub 命名空间和凭证尚未提供，不执行任何推送。
- 真实数据库、模型服务及 Java 环境需单独验收；已有源码目录和迁移历史保持不变。
- lint 剩余 4 条警告：video-gen-dialog、create-project-dialog、共享 safe-image 的原生图片标签，以及共享 sign-in-flow 的未使用导入；遵守不修改 components/ui 的规则。
- 后端新增 VersionReleaseConfigurationTests 尚未执行；发布流水线及 Compose 仅完成配置检查和 YAML 语法解析，不代表已在 GitHub/Docker 环境验收。
- pipeline-store 拆出类型后仍接近 1000 行，后续新增业务前应继续按职责拆分。旧 store 中仍被引用的窗口几何字段保留，本次仅删除无引用的浮窗展示实现。
