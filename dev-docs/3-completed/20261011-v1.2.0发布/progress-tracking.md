# 进度

- [x] 核对 PR 版本、发布工作流和当前本地数据库迁移历史。
- [x] 在独立 worktree 合并五个 PR，均无文本冲突。
- [x] 完成逐项修复和针对性测试。
- [x] 完成整体构建与迁移验证。
- [x] 整理版本记录、提交、推送与发布。
- [x] 验证远端 PR 合并状态、Release 和 Docker 镜像发布。

## 发布前验收

- 后端启用真实 ffmpeg 回归的完整 Maven package：555 项测试通过，0 失败、0 错误、0 跳过，产物为 `ai-fusion-video-1.2.0.jar`。
- 前端 frozen lockfile 安装、TypeScript 检查与 Next.js 生产构建通过；ESLint 为 0 错误、20 项既有警告；分镜刷新测试 7/7 通过。
- 浏览器验收：第二集选中状态保持，刷新前后滚动位置均为 373.3333435px，修改内容成功呈现；首尾帧编辑弹窗正常打开；生成中的记录不显示删除操作，已完成记录显示删除操作；浏览器无错误日志。
- 独立 MySQL 空库完成 baseline 及后续迁移，Flyway validate 通过，识别 27 条迁移；基于本地持久化库的结构和历史副本验证增量升级，只新增 `V1.1.2.0.0__add_episode_bgm_fields.sql`，4 个配乐字段正确建立，升级后 validate 通过。
- 原有持久化库及其迁移历史保持不变；新脚本改名时 SQL 内容保持不变。未调用真实付费生成服务。
- 已统一前后端版本为 1.2.0，修正 pnpm 构建依赖配置，发布工作流改为 clean package，避免旧编译输出残留迁移脚本。
- 推送前确认五个 PR 的 head 与审核版本一致，远端 main 为 `5fec8bb09efb185d285204f26a8ef9bd376f4396`，远端尚无 v1.2.0 标签。

## 发布验收

- 2026-10-11 主分支与 v1.2.0 标签原子推送，版本代码为 `856b94fcc685b2ff86660a4376ce808ad719baf2`；GitHub 确认五个 PR 全部 merged。
- [Docker 发布工作流](https://github.com/Stonewuu/ai-fusion-video/actions/runs/38129699138) 完成且结论为 success。两个镜像均具备 amd64/arm64，`1.2.0` 与各自 `latest` 摘要相同。
- 拉取已发布的前端 amd64 镜像，容器默认入口正常启动，登录页 HTTP 200；测试容器已清理。
- [v1.2.0 Release](https://github.com/Stonewuu/ai-fusion-video/releases/tag/v1.2.0) 于北京时间 2026-10-11 18:05:58 正式发布，并确认是仓库 latest release。
- 本地 main 已同步发布代码，完成后随最终验收文档再次快进同步；开发文档归档至 3-completed。
