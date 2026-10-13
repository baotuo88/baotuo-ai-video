# 完成记录

## 原因与实现

AgentPersistenceMigrationIT 的重复键发生在 seedLegacyMessageOrdering 插入测试数据阶段，而不是 V1.0.6.1.5 的重排阶段。为保证构造真正的旧库，两处历史数据库初始化统一调用 migrateLegacySchema：在各自测试专用空库建立版本 0 baseline 记录，执行到 1.0.6.1.4，完成 validate 并断言当前版本。插入历史重复数据前断言新唯一索引不存在。后续升级及唯一约束断言保留。

PlatformSubAgentRunServiceIT 的子运行属于当前实例；cancelChildren 等待本地确认与终态持久化后返回，因此断言严格改为 CANCELLED，父运行仍严格断言 RUNNING。另一个并发测试的父运行属于远端 parent-node，其 CANCEL_REQUESTED 断言保持原样。

## 验证

2026-10-13：mvnw.cmd -B -Dtest=FlywayMigrationNamingTests test 成功，2 项通过且完成生产与测试源码编译。git diff --check 通过。无历史 SQL、生产代码或工作流修改。

本机没有 Docker，未执行容器集成测试，也未推送提交或移动发布标签。需提交这两个测试文件及本目录后由 GitHub Quality checks 运行完整集成测试；通过后再安排发布。
