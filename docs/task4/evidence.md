# Task 4 — Workflow evidence / 协作证据

状态：进行中。2026-11-06 按 V0 后续分工整理；只将有依据的活动记为已完成。新增任务仍待各成员实际执行。

## 已知贡献与追踪链

| 项目 | 已知状态与依据 |
| --- | --- |
| Requirement | [T4-01](requirement.md)；[Issue #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)，作者 `Justmao1`，核查时 open |
| V0 实现与原 AC 测试 | Peng 的 [PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3) 已合并；不归为 ChangPeng 新增贡献 |
| 已核查 main | `f75ba58a6713ae0f020ae2bf4f0db7bb8f5c30c9` |
| Feng CI | 按团队确认个人任务已完成；[PR #2](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2)，核查时 open、可合并；保留其实际贡献 |
| Peng 的 CI 评审 | [正式批准评审](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2#pullrequestreview-5796639750)，已完成 |
| 基线 main Actions | PR #2 文档引用 [run 42174104141](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42174104141)；本轮未独立读取该 run，最终汇总时核实 SHA 与结果 |
| 分工调整 | [README](README.md)、[核查记录](assignment-review.md)；本次分工文档提交不代表成员新增任务已完成 |

## 本轮新增贡献

| Member | 本轮交付 | PR / review / response | 状态 |
| --- | --- | --- | --- |
| Peng Ke | 自动判定成败的 demo；正常和故障注入验证；评审新增测试 | pending | 待执行；原 V0/CI 评审已完成部分见上表 |
| ChangPeng Shi | REG-01–04 新增测试；评审 demo | pending | 待执行 |
| ZheKai Mao | 更新 Issue、独立复现、实际验收、证据与 3–5 句复盘 | pending | Issue 已创建，其余待执行 |
| HaoZhe Feng | 保留原 CI 完成项 | PR #2，相关 Checks/验证材料由最终汇总引用 | 不重新分配任务；合并状态单独记录 |

## 最终集成

- Peng demo PR 与合并 SHA：pending
- ChangPeng 回归测试 PR 与合并 SHA：pending
- Feng CI PR 最终合并记录：pending（核查时仍 open）
- 最终验收使用的完整 main SHA：pending
- 对应该 SHA 的成功 Actions 链接：pending
- Mao 验收/证据文档 PR、Peng 复核链接：pending

## 实际验收

下表由 Mao 根据最终集成版本填写，不以已有 V0 自动技术检查代替本人验收。

| Case | Expected | Actual | Pass/fail | Tester/date/SHA/evidence |
| --- | --- | --- | --- | --- |
| AC1 insufficient | tomato 1 piece | pending | pending | pending |
| AC2 exact | [] | pending | pending | pending |
| AC3 surplus | [] | pending | pending | pending |
| AC4 absent | tomato 2 piece | pending | pending | pending |
| AC5 input preservation | original inputs unchanged; independent outputs | pending | pending | pending |
| DEMO-01 | 正确结果退出 0 | pending | pending | pending |
| DEMO-02 | 错误结果退出非 0，引用 Peng 的实际负向验证 | pending | pending | pending |
| REG-01–04 | 具名回归测试全部成功 | pending | pending | pending |
| ACCEPT-01 主流程 | 样例缺 1 番茄；库存改为 2 后无需采购 | pending | pending | pending |

## 第二成员 clean clone

- Person/date/OS/Node/npm：pending（由 ZheKai 本人执行）
- 新 clone 目录、远端 URL、完整提交 SHA：pending
- 命令：`git clone`、`npm ci`、`npm run demo`、`npm run test:final`、`npm run build`
- 实际输出、退出码、问题和证据：pending，保存到 `zhekai-reproduction.md`
- 基线复现与最终新增任务集成后的复验分别标明 SHA；不得复用旧结果描述新版本。

## 团队复盘

由 Mao 在实际协作之后写 3–5 句：本次约定如何帮助分工、测试或评审确认/发现了什么、下一轮改进什么。没有发现缺陷可如实写确认了什么。Actual reflection: pending。

## 限制

代码及文档可有 Codex 协助，但个人贡献按真实账号、diff 和活动记录归属。本次制定任务不代表任务完成；Feng 已完成的个人工作不因模板 pending 重置。Task 4 结果不代表 V1 的数据库、多人隔离或单位转换已经完成。
