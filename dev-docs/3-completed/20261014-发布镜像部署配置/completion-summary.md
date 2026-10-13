# 完成记录

部署模板使用 baotuo88/baotuo-ai-video-backend:1.2.1 与 baotuo88/baotuo-ai-video-web:1.2.1。Compose 继续通过必填变量读取镜像，不新增缺失配置兜底。基础服务镜像、容器标识和数据卷保持原有配置。

README 优先展示镜像部署：克隆仓库、复制模板、修改密码、检查镜像配置、拉取并启动、检查状态和日志；注明远程访问端口、Nginx 挂载文件和升级保留 .env/数据卷的要求。

验证：YAML 解析和镜像变量映射校验通过，git diff --check 通过。未进行真实 Docker 部署，未推送代码；本次部署模板与文档变动不要求重建应用镜像。
