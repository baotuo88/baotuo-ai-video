# 技术债务与验证边界

- 此次修复未引入 fallback。
- 后端 `AgentRunMaintenanceScheduler` 仍每约 5 秒报告 `DataIntegrityViolationException`。当前日志只记录异常类型，未显示具体 SQL 或约束，不能据此确定数据库故障原因。
- 前端启动已恢复；分镜更新后的滚动位置和弹窗状态仍需浏览器业务场景验证，生产构建通过不能替代交互回归。
