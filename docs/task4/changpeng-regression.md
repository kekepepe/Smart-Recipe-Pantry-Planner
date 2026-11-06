# ChangPeng — 缺口函数多食材回归测试

日期：2026-11-06（Asia/Shanghai）。账号：ChangPeng Shi / `Lsiav`。
关联：[需求 #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)、[Task 4 分工](README.md)、[分工核查记录](assignment-review.md)、[T4-01 需求](requirement.md)。

本记录对应分工中的 REG-01 至 REG-04，以及 README 要求的分支与文件约定。

## 改动范围

- 分支：`task4/shortages-regression`，自 main `9057ec522c86a42b015162dba083b6c29af0357e` 建立。
- 新增：`tests/calculate-shortages-regression.test.js`（5 个具名测试，无 TODO / skip）。
- 未修改 `src/` 下任何文件，未修改 Feng 的 `.github/workflows/test.yml`，未修改 Peng 的 `examples/shortages-demo.js`。
- 原 `tests/calculate-shortages.test.js` 中 V0 带来的 AC1–AC5 断言保留不动，不追溯归为本次新贡献。

## 为什么新增文件而不是改现有测试

`calculate-shortages.test.js` 承载 AC1–AC5 验收编号，是 Mao 验收和 evidence.md 的追踪锚点，改动它会破坏编号对应关系。独立文件也让 Peng 的评审 diff 只包含本次新增内容。`package.json` 的 `test` 脚本为 `node --test tests/*.test.js`，新文件自动纳入，无需改脚本。

## REG-01 至 REG-04 的覆盖对应

| 编号 | 要求 | 测试名 | 手写预期的推导 |
| --- | --- | --- | --- |
| REG-01 | 同时存在正缺口、刚好够用、富余和零需求，仅返回正缺口 | `REG-01: mixed positive/exact/surplus/zero-requirement returns only positive gaps` | tomato 2−1=1 保留；egg 2−2=0 省略；onion 3−1=2 保留；salt 0−0=0 省略；milk 2−3=0 省略 → `[tomato 1, onion 2]` |
| REG-02 | 库存乱序与反转均不影响按 ID 匹配 | `REG-02: pantry permutation and reversal do not affect ID-based matching` | noodle 3−2=1；tofu 2−5=0 省略；scallion 缺失按 0 → 4；oil 1−0=1。原序、`reverse()`、第三种手工重排三次断言结果相同 |
| REG-03 | 无关库存（含不同单位）不影响结果，不涉及单位转换 | `REG-03: unrelated pantry stock, including other units, does not change the result` | tomato 2−1=1 保留；egg 4−4=0 省略。最小库存与含 sugar/butter/soy-sauce/flour 的 6 项库存结果一致 |
| REG-04 | 需求改序决定结果顺序；多个输出对象独立且输入不变 | `REG-04: requirement order drives output order and outputs are independent of inputs` | 同一库存下需求两种顺序分别得 `[tomato 1, egg 2, onion 1]` 与 `[onion 1, tomato 1, egg 2]`；再逐一篡改输出对象的 quantity / ingredientId / unit 并 push，断言需求数组与库存数组仍等于调用前的 `structuredClone` 快照 |

REG-01 采用的正是 README 建议夹具（tomato 2、egg 2、onion 3、salt 0、milk 2；库存 unrelated 99、milk 3、onion 1、egg 2、tomato 1；预期 tomato 1、onion 2）。第 5 个测试 `regression: combined fixture pins full output shape across four conditions` 是组合夹具，把七项需求（正缺口 / 刚好 / 富余 / 缺失 / 零需求 / 跨单位）与含无关项的库存一起钉住完整输出形状，并复验反转不变与需求子集重排。

## 范围边界

按 Issue #1 与 requirement.md 的夹具规则：每个数组内 ID 唯一、数量为有限非负数、相同 ID 单位一致。输入校验、单位转换、重复 ID 聚合均在本函数试验范围之外，由 `src/evaluate-recipe.js` 的 `validateItem` / `evaluateRecipe` 负责，因此本文件不断言这些行为，也不为它们制造缺陷。`tests/evaluate-recipe.test.js` 覆盖的是另一模块，不能替代对本纯函数的直接回归。

所有预期值均按 `shortage = max(required − available, 0)`、省略零缺口、保持菜谱顺序手工推导，未使用被测函数生成预期。

## 实际验证

环境：Windows 11，git 2.55.0.windows.5。Node.js 使用本机自带的 **v22.14.0**，满足 `package.json` 的 `engines: >=22.12.0 <23`；`.nvmrc` 指定 22.23.1，此处以 22.14.0 运行（同为 22.x，测试与检查脚本只依赖 `node:test`、`node:assert/strict` 与 `structuredClone`，不依赖 22.23.1 专有行为）。系统另有 Node v21.2.0，不满足 engines，已弃用。npm 在 Node 22 下无 `EBADENGINE` 警告。

> 未运行 `npm ci` 与 `npm run build`：本地无 `node_modules`，且这两项由 CI 执行、并由 Mao 的 clean-clone 复现（REPRO-01）覆盖。本 PR 只新增测试与文档，不进入 `vite build` 的构建产物，不影响构建结果。

基线（改动前，main `9057ec5`）：16 pass / 0 fail / 0 skipped / 0 todo。

改动后实际输出：

```
$ node --test tests/calculate-shortages-regression.test.js
ok 1 - REG-01: mixed positive/exact/surplus/zero-requirement returns only positive gaps
ok 2 - REG-02: pantry permutation and reversal do not affect ID-based matching
ok 3 - REG-03: unrelated pantry stock, including other units, does not change the result
ok 4 - REG-04: requirement order drives output order and outputs are independent of inputs
ok 5 - regression: combined fixture pins full output shape across all four conditions
# tests 5
# pass 5
# fail 0
# skipped 0
# todo 0

$ npm test
# tests 21
# pass 21
# fail 0
# skipped 0
# todo 0

$ npm run test:final
Completion precheck passed; acceptance tests follow.
# tests 21
# pass 21
# fail 0
# todo 0
（退出码 0）

$ npm run demo
Demo verification: 5/5 passed, 0 failed.
（退出码 0；此为 Peng 改进后的 demo，非本 PR 改动内容）
```

`git diff --check` 通过，无空白错误。16 → 21 项，新增 5 项，与预期一致。

## 变异验证（确认测试确实能捕获错误）

为证明断言不是空转，在本地临时把 `src/calculate-shortages.js` 改坏三次，每次跑新增测试后完整还原，故意破坏的实现**不提交**（与 README 对 Peng 的 DEMO-02 负向验证要求同理）：

| 变异 | 注入的错误 | 新增测试结果 | 说明 |
| --- | --- | --- | --- |
| 1 | 用 `pantry[index]` 按位置匹配，取代 `Map` 按 ID 匹配 | 0 pass / 5 fail | REG-02 的乱序与反转断言、REG-03 的无关库存断言全部捕获 |
| 2 | 去掉 `quantity > 0` 过滤，保留零缺口 | 1 pass / 4 fail | REG-01、REG-03 与组合夹具捕获；REG-04 仍通过属预期——其夹具三项均为正缺口，本就不负责零缺口省略 |
| 3 | 输出按 pantry 顺序，且直接返回入参对象引用并原地改写 `quantity` | 0 pass / 5 fail | REG-04 的输入不变性与对象独立性断言、组合夹具的顺序断言全部捕获 |

还原后 `git diff --stat -- src/calculate-shortages.js` 为空，5 个测试重新全部通过，确认实现文件与 main 完全一致。

## 待完成 / 待他人执行

- 提交本人 PR，关联 `Related to #1`（不写 `Closes #1`）。
- 按分工文档，本 PR 应由 **Peng（`kekepepe`）** 评审；对 Peng 的 demo PR 需给出具体评审，重点检查错误返回值能否触发非 0 退出（DEMO-02）。
- 本记录不构成 Mao 的独立复现（REPRO-01）或人工验收（ACCEPT-01），也不代表远端 Actions 已通过。
- 若需与 `.nvmrc` 严格一致，可在 Node 22.23.1 下复跑一次并追加输出；当前 22.14.0 结果已满足 engines 范围。

## AI 协助声明

本文件与 `tests/calculate-shortages-regression.test.js` 在 ChangPeng Shi 本人监督下由 AI 协助起草，包括夹具设计、断言编写与变异验证执行；预期值按需求合同手工推导并经本地运行核对。按 Issue #1 的 Evidence integrity 要求，此工作记于实际负责该任务的本人账号名下，不代表其他三位成员的贡献。
