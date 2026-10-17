# 完成记录

Compose 的预构建镜像和本地构建模式现在都让 Nginx 在 backend healthcheck 通过后启动，降低首次访问 502。后端使用 `JAVA_TOOL_OPTIONS` 接收 JVM 内存参数，Java 启动器会直接读取该变量。

Docker 发布工作流获得 `contents: write` 权限，在前后端镜像推送成功后执行 `gh release create`，创建带自动生成说明的 `vX.Y.Z` GitHub Release。版本检查服务读取的 Releases API 因此与镜像版本保持一致。

验证：两个 Compose 文件与工作流 YAML 解析通过，git diff --check 通过。未推送提交，未执行真实 Docker 启动。
