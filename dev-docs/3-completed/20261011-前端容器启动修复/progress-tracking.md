# 进度

- [x] 确认前端 Restarting (127)，日志报告入口脚本 not found。
- [x] 确认文件存在且可执行，故障来自 CRLF shebang。
- [x] 工作区入口脚本恢复 LF，根目录增加 `*.sh text eol=lf`。
- [x] 使用 `docker-compose.build.yml` 完成前端无缓存构建。
- [x] 仅重建前端容器，Next.js Ready，重启次数为 0，宿主机 8080 返回 HTTP 200。
