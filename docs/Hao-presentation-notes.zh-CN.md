# Hao：个人演示与复盘提纲

这是个人发言草稿，不代表团队已确认范围或已经完成全组排练。全组演示加讲解总时长不得超过 15 分钟；建议 Hao 部分约 2 分钟，具体时段由团队统一分配。

## 我的角色与证据（约 30 秒）

我负责数据持久化、迁移与恢复、跨平台检查及技术评审。第一轮我修复了 Windows 测试中数据库未关闭导致的 EBUSY 问题（#15），并提交了固定版本的查询延迟测量（#17）：600 次有效响应，五条件查询中位数 14.912 ms、p95 17.549 ms。这是本机暖缓存结果，不代表公网或多用户性能。

## 演示我的技术贡献（约 45 秒）

在团队确认的最终演示版本上，先记录源码 SHA，再展示库存和已选菜谱；关闭并重启应用，确认数据保持。演示前准备独立测试数据库及备份，不操作个人真实库存。已购标记仅在 #26 修复、P03 集成并完成回归后的版本上演示；当前候选尚不能声称最终交付。展示一次备份/恢复记录或测试证据即可，避免现场长时间安装依赖。

## 我遇到的问题与改进（约 35 秒）

我认为我们一开始想实现的功能太多，部分功能对用户完成做饭和采购任务的价值还没有得到验证，却增加了开发、集成和测试成本。第一轮没有外部用户试用数据，所以不能把这个判断表述成“用户证明这些功能没用”。

我的改进建议是：以“维护库存 → 找到可做的菜 → 生成准确的采购清单”为核心，先满足 Assignment 1 的必需需求和可靠性要求。每个新增功能都要说明对应的用户任务、验收方法和开发成本；价值或产能不足的功能明确延期。已承诺需求若改变，要在展示中逐项解释理由，不能悄悄省略。更早安排真实用户试用，再决定扩展功能。

## English speaking draft（用于练习，不声称已计时排练）

My role focuses on persistence, database recovery, cross-platform checks and technical reviews. In the first iteration, I fixed a Windows test failure caused by an open SQLite connection. I also measured query latency on a fixed application version, keeping the raw results and clearly stating the limits of the experiment.

One lesson for me is that we initially planned too many features before validating their value to the main user task. Extra features also increase integration and testing effort. We do not yet have external user evidence to say those features are useless. My proposal is to prioritize the core pantry, recipe and shopping-list workflow, then evaluate additions against a real user task and a clear acceptance check. Any changes to our original requirements should be explained explicitly, with incomplete or deferred work shown honestly.

## 全组演示前必须补齐的核对

- 将 Assignment 1 原文逐项映射到最终版本：已完成、部分完成、延期；附演示步骤与证据。此文件不是原始需求清单的替代品。
- 固定实际演示源码 SHA 和两平台安装包校验值；只展示该版本已存在的功能。
- 全员分别说明自己的角色；至少完整计时排练一次，包含切换、启动和故障备用步骤。
- Windows 候选包试装、最终 Release 下载权限、物理断网/干净环境验收分开记录，未执行的项目不要写成通过。
