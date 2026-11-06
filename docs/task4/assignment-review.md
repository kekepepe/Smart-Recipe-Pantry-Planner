# Task 4 分工核查与调整依据

日期：2026-11-06，Asia/Shanghai。Codex 根据 GitHub 当前内容和本地源码核查，按用户指示调整后续分工。

## 核查依据

- `git fetch origin` 后，main 为 `f75ba58a6713ae0f020ae2bf4f0db7bb8f5c30c9`。
- [PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3)：作者 `kekepepe`，merged；包含计算函数、六项真实缺口测试及 V0 其他测试。现有全部测试共 16 项。
- [Issue #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)：作者/assignee `Justmao1`，open；正文仍为原分工，无验收完成勾选。`docs/task4/requirement.md` 和 `evidence.md` 在 main 仍保留 pending。
- 仓库全部状态 PR 查询当时只返回 #2、#3；未发现 ChangPeng 独立测试 PR。此结论限于当前可查记录，不推断其线下活动。
- [PR #2](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2)：作者 `fhhhz-todd`，head `c65ee6a38d6f0419c1856743d6be360d7449b34c`；正文已更新为 V0 集成和 Windows 验证。核查时 open、mergeable=true，Peng 已有 [APPROVED](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2#pullrequestreview-5796639750)。用户确认 Feng 已完成全流程，保留其个人任务完成状态；PR 合并状态仍按 GitHub 记录。
- `docs/V0-ACCEPTANCE.md` 将第二成员 clean-clone 复现列为待完成；Feng 的 PR 也明确其复用现有 clone，不算该项。

## 结论

Peng 的原函数实现已完成，有 PR #3；评审/验收仍应按实际记录判断，其 CI 批准已存在。ChangPeng 的原编码目标（五个真实断言）已被 V0 做完，但未发现归属于其本人的独立贡献记录。Mao 已完成创建需求 Issue，后续实际验收、文档 PR、证据和复盘未见完成记录。因此不能把三人原分工整体都标为完成，也无需倒退代码重新做一次。

## 选择的新工作

| 成员 | 尚有实际价值的工作 | 与现有代码的区别 |
| --- | --- | --- |
| Peng | demo 可自动判定成败，覆盖 AC1–AC5，并验证错误返回时非 0 退出 | 现有 demo 仅打印 Expected/Actual；错误数组不会自动触发失败 |
| ChangPeng | 新增四类多食材缺口回归测试，交叉评审 demo | 现有纯函数测试没有明确覆盖库存反转不变、混合状态、无关库存和需求改序的组合；其他模块测试不能代替此函数回归 |
| Mao | 本人独立 clone 与最终验收，补齐证据和复盘 | V0 的 Codex 技术检查及 Feng 的原目录复验均没有完成该项 |
| Feng | 保留完成项 | 不再要求复制模板或重写工作流 |

保留原 T4-01 合同和 AC 编号，不扩大到数据库、单位转换或多菜谱。新增文件分别归不同成员负责，降低并行冲突。先交叉评审并合并代码，再由 Mao 对最终 SHA 验收；实际任务清单见 [README](README.md)。

本次只修改分工与证据文档，不替三人执行新增任务，不更新远端 Issue、不发布评审、不合并 PR。旧 `kepeng-check.md` 是此前时间点的本地草稿，其 PR #2 正文和合并能力信息已被本次核查更新，不能直接发布旧评审草稿。
