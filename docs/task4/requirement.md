# T4-01 — Single-recipe shortages / 单菜食材缺口

状态（2026-11-06）：原函数与 AC1–AC5 自动断言已随 V0 PR #3 合并；后续协作验收未全部完成。
需求 Issue：[#1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)，由 ZheKai / `Justmao1` 创建。
调整后的责任和流程以 [Task 4 分工](README.md) 为准；本文件保留原功能合同，并增加验收入口与回归覆盖要求。Issue 正文尚需 Mao 同步更新。

As a cook, I want to calculate missing ingredients for one recipe from pantry stock so that I know what to buy.

Small slice of PRD P3. Function: `calculateShortages(requirements, pantry)`.
Input arrays contain `{ ingredientId, quantity, unit }`: unique IDs per array, finite non-negative quantities, same units for matched IDs. Validation, duplicate aggregation, unit conversion, persistence and multi-recipe calculation remain outside this function's trial scope.

Match by ingredientId. Missing stock = zero available. Shortage = max(required − available, 0). Return only positive gaps as new objects, preserve recipe order, and do not mutate inputs. Unrelated pantry stock has no effect.

| ID | Need | Pantry | Expected |
| --- | --- | --- | --- |
| AC1 | tomato 2 piece | tomato 1 piece | tomato 1 piece |
| AC2 | egg 2 piece | egg 2 piece | [] |
| AC3 | egg 2 piece | egg 3 piece | [] |
| AC4 | tomato 2 piece | [] | tomato 2 piece |
| AC5 | valid fixtures | valid fixtures | input arrays and objects unchanged; output objects independent |

## V0 后续验收要求

| ID | Owner | Acceptance |
| --- | --- | --- |
| DEMO-01 | Peng | `npm run demo` 实际断言 AC1–AC5；显示预期与实际；正确时退出 0 |
| DEMO-02 | Peng | 临时副本注入错误返回值时 demo 实际退出非 0；故意错误不提交 |
| REG-01 | ChangPeng | 多食材混合不足/刚好/富余/零需求，仅返回正缺口 |
| REG-02 | ChangPeng | 库存乱序和反转均不影响按 ID 匹配结果 |
| REG-03 | ChangPeng | 无关库存不影响结果 |
| REG-04 | ChangPeng | 需求改序决定结果顺序；多个输出对象独立且输入不变 |
| REPRO-01 | ZheKai | 本人新目录 clean clone；记录环境、完整 SHA 和安装/demo/最终测试/构建输出 |
| ACCEPT-01 | ZheKai | 最终集成 SHA 上验收 AC1–AC5、DEMO/REG；记录实际结果和主流程人工验收 |

本分工保留 Feng 已完成的 CI 工作和 Peng 已完成的 V0 实现，不要求重写。新增 demo、回归测试、复现与文档各自提交 PR，交叉评审及回应按 README 执行。

Done: 新增修改 reviewed/merged；集成 main 的 demo、最终测试、构建与 Actions 成功；第二成员 clean-clone 复现、实际验收、四人实际贡献链接和复盘记录在 [evidence.md](evidence.md)。测试不得有 TODO/skip。当前计划不代表上述新增工作已执行。
