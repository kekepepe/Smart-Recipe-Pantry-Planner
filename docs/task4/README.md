# Task 4 协作试验：V0 后续验收与回归

本分工于 2026-11-06 按当前仓库调整，替代原来的“实现 TODO / 替换五个 TODO 测试”安排；不改变 Task 3 的长期职责。目标仍是围绕 **T4-01 单道菜食材缺口**完成可追踪的需求、修改、PR、评审、测试、集成和复盘。

## 1. 当前工作完成到哪里

核查基线：main `f75ba58a6713ae0f020ae2bf4f0db7bb8f5c30c9`，V0 [PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3) 已合并。详见 [分工核查记录](assignment-review.md)。

| 成员 | 原分工现状 | 本轮安排 |
| --- | --- | --- |
| Peng Ke / `kekepepe` | 计算函数及真实测试已随其 V0 PR #3 合入；已正式批准 CI PR #2 | 保留原贡献，补充可自动判定成败的 demo 验收程序 |
| ZheKai Mao / `Justmao1` | 已创建 [Issue #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)；仓库尚无完整实际验收、第二成员复现和复盘记录 | 保留需求贡献，完成独立复现与证据收尾 |
| ChangPeng Shi | 原五个 TODO 断言已被 V0 实现；查询到的 PR 中未发现其独立测试 PR，不能归为其已完成贡献 | 增加缺口函数的多食材回归测试，并评审 Peng 的 demo |
| HaoZhe Feng / `fhhhz-todd` | 按团队确认，其 CI 全流程任务已完成；已有 [PR #2](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2) 和 Peng 的批准评审 | 保留完成项，不重新分派 CI 实现 |

核查时 GitHub 的 PR #2 状态仍为 open、已获批准；这不推翻 Feng 的个人任务完成情况。最终合并和新 main Actions 链接由团队集成时如实记录，不能提前写成已合并。

## 2. 环境与起步

当前已是 React/Vite 项目，旧骨架“无需 npm install、只有五个 TODO”的说明不再适用。使用 `.nvmrc` 指定的 Node.js（当前 22.23.1），不要用 Node 24。

```bash
git clone https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
# 安装/切换到 .nvmrc 指定的 Node 后：
npm ci
npm run demo
npm run test:final
npm run build
```

当前基线有 16 项真实测试，不能把这个数字固定为最终数量；新增测试后按实际输出记录。界面运行和 Windows 环境见 [V0 手册](../V0-RUNBOOK.md)。

## 3. 调整后三人的具体交付

### Peng：让 demo 成为可靠的自动验收入口

分支：`task4/demo-verification`。主要文件：`examples/shortages-demo.js`；记录：`docs/task4/peng-demo-verification.md`。

现有 demo 只打印 Expected / Actual，没有比较结果；即使函数返回错误数组，只要不抛错，进程也可能成功退出。这是 V0 尚未完成的具体改进。

交付要求：

1. 保留 `npm run demo` 入口，用手写预期和真实断言校验 AC1–AC4，并加入 AC5 的输入不变性检查；每项显示编号、预期、实际和结果。
2. 全部正确退出码为 0；任何结果不一致或异常退出非 0。不能仅打印 PASS，也不能用被测函数计算预期。
3. 继续调用现有计算函数，不重写业务规则，不修改 Feng 的 CI。CI 已有/将有 demo 步骤，可直接使用改进后的退出码。
4. 在临时源码副本中把返回结果改错（例如始终返回 `[]`），实际执行 demo，确认至少 AC1 失败且退出码非 0；记录命令和退出码。不要把故意破坏的函数提交。
5. 提交本人 PR，关联 `Related to #1`；请 ChangPeng 评审，回应具体意见；同时评审 ChangPeng 的新增回归测试。

完成证据：demo diff、正常与负向验证输出、PR、评审回应、集成后的成功 Checks。当前只是分配，尚未执行。

### ChangPeng：补充多食材回归测试

分支：`task4/shortages-regression`。主要文件：新增 `tests/calculate-shortages-regression.test.js`；记录：`docs/task4/changpeng-regression.md`。

已有 AC1–AC5 保留。新增测试至少覆盖以下四类当前缺口函数测试尚未明确覆盖的条件：

1. 同一菜谱同时存在正缺口、刚好够用、富余和零需求，结果只含正缺口，数量正确。
2. 多个匹配库存排列与需求不同；反转 pantry 后结果相同，证明按 ID 而非位置匹配。
3. 添加菜谱不需要的库存（可使用不同单位）不改变结果；不要求增加单位转换。
4. 改变需求顺序，结果随正缺口在需求中的顺序变化；返回多个对象均与原输入独立，修改输出后输入不变。

建议夹具（数量单位均为 piece）：需要 tomato 2、egg 2、onion 3、salt 0、milk 2；库存按 unrelated 99、milk 3、onion 1、egg 2、tomato 1 排列；手写预期为 tomato 1、onion 2。也可自行设计等价夹具。

用 `node:test` 和 `node:assert/strict`，至少四个具名测试，不留 TODO/skip；不得复制原 AC1–AC4 作为新增贡献，不得以 demo 输出替代单元断言。其他模块已有类似测试不等于已直接验证本纯函数。

运行新增测试和 `npm run test:final`，记录真实结果。提交本人 PR，关联 `Related to #1`，由 Peng 评审；对 Peng 的 demo PR 给出具体评审，检查错误结果能否触发失败。原 V0 断言不追溯归为 ChangPeng 的新贡献。

### ZheKai：独立复现、实际验收与证据收尾

分支：沿用 `task4/requirements-evidence`。文件：`requirement.md`、`evidence.md`，新增 `docs/task4/zhekai-reproduction.md`（需要截图时放 `docs/task4/evidence/`）。

Issue #1 已由本人创建，不再要求创建重复 Issue。保留 T4-01 原输入输出约定，按本轮分工在 Issue #1 的任务清单中更新后续工作，并保留 V0 与 Feng 的已完成贡献。该远端更新由本人实际操作，本次文档调整不等于已更新 Issue。

交付要求：

1. 在本人环境新目录从远端 clean clone，不复用已有 node_modules，不以 Peng 的临时 archive 副本或 Feng 的现有 clone 代替。
2. 记录本人、日期、OS、Node/npm 版本、远端 URL、完整 SHA；运行 `npm ci`、`npm run demo`、`npm run test:final`、`npm run build`，保留实际输出和退出码。
3. Peng 和 ChangPeng 的 PR 合并后，在新集成 SHA 重跑上述命令。第一次可做基线复现，最终证据必须标明新增工作已集成。
4. 按 requirement.md 的 AC1–AC5 和新增验收要求填写预期、实际、结果及证据位置；通过 `npm run dev` 人工检查一条主流程：样例库存 → 番茄菜谱缺 1 → 生成清单 → 库存改为 2 → 清单无需采购，附实际截图或操作记录。
5. 汇总各成员真实 Issue/PR/具体评审/回应/Checks 链接，区分 V0 已有贡献与此次新增贡献；写 3–5 句真实复盘。没有活动证据的项目保留 pending。
6. 提交本人文档 PR，由 Peng 复核验收 SHA、命令与链接；若已有 Feng 的文档复核记录可直接引用，不给已完成 CI 的成员增加必做任务。

## 4. 协作顺序和完成定义

1. 本分工文档经团队确认并合入后，Mao 在 Issue #1 更新任务清单；Peng、ChangPeng 从最新 main 各建自己的分支并行工作，分别修改 demo 和新增测试文件。
2. 交叉评审：ChangPeng 评审 Peng；Peng 评审 ChangPeng。发现问题要记录并回应，没有问题可明确说明检查了什么，不制造缺陷。
3. 各 PR CI 成功后按仓库权限合并；保留 Feng 原 PR 与批准评审。若 PR #2 仍未合并，处理其集成状态，不重复配置 CI。
4. Mao 对最终集成 SHA 独立复现、人工验收、更新证据并提交文档 PR；Peng 复核。新检查失败时保持未完成，修复后复验。
5. main 的 demo、最终测试、构建与 Actions 成功，证据链接齐全、实际验收与复盘完成后，Mao 才关闭 Issue #1。

每人使用本人账号提交，PR 写 `Related to #1`，描述实际修改、验证命令及结果、请求评审人。只有 Issue 的所有条件都完成后才关闭，不在单个实现 PR 中提前写 `Closes #1`。AI 协助按实际情况说明。

本次调整只制定后续任务，不代替三人提交代码、运行独立验收或发出评审。Task 4 完成也不表示 V1 的持久化、多用户或单位转换已经实现。
