# baotuo-ai-video

AI 视频创作工作台，基于 [Stonewuu/ai-fusion-video（融光）](https://github.com/Stonewuu/ai-fusion-video) 二次开发。项目仓库：[baotuo88/baotuo-ai-video](https://github.com/baotuo88/baotuo-ai-video)。保留原作者署名及 MIT 许可，详见 LICENSE。

## 工作台

- 左侧统一导航，中间编写剧本、编辑分镜和管理素材，右侧 AI 创作助手。
- 桌面导航和助手可收起，并记住当前浏览器的偏好；手机端使用抽屉。
- 未发送附件按用户和会话保存在当前页面内存中，收起助手或切换屏幕尺寸不会丢失；刷新页面或退出登录会清空附件。文字草稿沿用持久化保存。
- 图片、视频生成按模型协议接入，结果可用于分镜与视频合成。

## 从源码部署

需要 Docker Engine 和 Docker Compose。在项目根目录执行：

```bash
git clone https://github.com/baotuo88/baotuo-ai-video.git
cd baotuo-ai-video
cp .env.example .env
docker compose -f docker-compose.build.yml up -d --build
```

Windows 可使用 `Copy-Item .env.example .env`。部署前请修改 `.env` 中数据库及 Redis 密码。默认访问 `http://localhost:8080`，按初始化向导创建管理员。

源码构建使用本项目代码，不需要 Docker Hub 镜像配置。数据库、媒体与 Agent 工作区使用持久卷；不要为升级删除数据卷。

## 使用自己的发布镜像

在 `.env` 明确配置以下值：

```env
BACKEND_IMAGE_REPOSITORY=你的命名空间/baotuo-ai-video
FRONTEND_IMAGE_REPOSITORY=你的命名空间/baotuo-ai-video-web
IMAGE_TAG=1.2.0
```

上述仓库和版本必须已实际发布；占位文本不能直接用于部署。配置缺失时 Compose 会明确报错，不再使用上游镜像。

```bash
docker compose pull
docker compose up -d
```

升级时把 `IMAGE_TAG` 改为目标版本，再执行这两条命令。后端版本检查读取本项目 GitHub Release，并检查上述两个 Docker Hub 仓库的同名版本；镜像仓库未配置时会显示配置提示。

## 前后端独立部署

设置 `.env` 中 `PUBLIC_API_URL`（后端根地址，不含 `/api`）、`CORS_ALLOWED_ORIGIN_PATTERNS`、`FRONTEND_PORT` 和 `BACKEND_PORT`。启动：

```bash
docker compose -f docker-compose.build.yml -f docker-compose.separated.yml up -d --build
```

预构建镜像模式把第一个文件替换为 `docker-compose.yml`，去掉 `--build`。独立部署需自行配置 HTTPS 入口。

## 本地开发

需要 JDK 21、Node.js 20、pnpm 10、MySQL、Redis、FFmpeg 和 FFprobe。

```bash
cd ai-fusion-video
docker compose -f docker-compose-middleware.yml up -d
./mvnw spring-boot:run
```

Windows 使用 `.\mvnw.cmd spring-boot:run`。后端本地配置位于 `application-local.yaml`，FFmpeg 路径通过 `VIDEO_COMPOSE_FFMPEG_PATH` 与 `VIDEO_COMPOSE_FFPROBE_PATH` 配置。

另开终端启动前端：

```bash
cd ai-fusion-video-web
pnpm install --frozen-lockfile
pnpm dev
```

本地前端的 `DEV_BACKEND_URL` 在 `.env.development` 中配置。保留源码目录名、Java 包路径、数据库标识与迁移历史，避免品牌改名影响原有数据。

## 检查与发布

```bash
cd ai-fusion-video-web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` 自动发现前端测试文件，包括附件草稿、Pipeline 事件与分镜刷新测试。

GitHub 的 Quality checks 在分支推送和 PR 上执行前端检查、后端测试及 Agent 持久化集成测试。发布版本标签前，配置仓库 Actions Variables：

- `DOCKER_HUB_USERNAME`：Docker Hub 登录用户名。
- `BACKEND_IMAGE_REPOSITORY`：后端的 `命名空间/镜像名`。
- `FRONTEND_IMAGE_REPOSITORY`：前端的 `命名空间/镜像名`。

Actions Secrets 配置 `DOCKERHUB_TOKEN`。不要把 Token 写入源码或提交到仓库。

标签、前端 package.json 版本和后端 pom.xml 版本必须一致。发布任务先运行质量检查，再使用通过测试的后端 JAR 构建镜像，仅发布具体版本标签。没有发布配置时任务明确失败。本地工作区的改动不会自动上传或发布。