# 部署启动与版本发布修复

- 等待后端健康后再启动统一入口 Nginx。
- 让 Compose 的 JVM 内存参数通过 Java 标准环境变量生效。
- 在镜像发布成功后自动创建 GitHub Release，供版本检查读取。
