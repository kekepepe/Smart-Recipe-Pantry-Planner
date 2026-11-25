# 主食材推荐接口契约 / Staple-Recommendation Interface Contract (C01)

> 工作项：§10.2 C01（ChangPeng → ChangPeng，提及 Peng、Hao）。Peng 主审页面消费的字段与行为，Hao 复核 API 集成。
> Work item: §10.2 C01. Peng reviews the fields/behavior the page consumes; Hao reviews the API integration.

## 1. 端点 / Endpoint

```
GET /api/recommendations/staples[?<共享筛选参数>]
```

只读接口：不写入任何表、不推进 revision、不产生 pantry_version 变化。与 `/api/recipes` 完全共用筛选参数、归一化与校验（`parseRecipeFilters` + `filterRecipes`），因此「全部菜谱 / 用现有食材 / 每日灵感」三个入口的筛选合同一致，URL 状态可直接复用。

Read-only: no table writes, no revision or pantry_version change. Filter parameters, normalization and validation are shared verbatim with `/api/recipes`, so the "All recipes / Use what I have / Daily inspiration" tabs stay on one filter contract.

筛选错误（未知参数、非法维度值、国家/地区矛盾、非法分页值等）返回 `400 INVALID_FILTER`，结构与 `/api/recipes` 一致：`{"error":{"code","message","field","requestId"}}`。

## 2. 响应字段 / Response fields

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `recommendations` | 数组 | 候选菜列表，已按 §3 排序 |
| `total` | number | 候选数量 |
| `hasStapleMatch` | boolean | `false` 表示「暂无主食材匹配」（库存为空或只有调料），页面据此展示空态与录入/浏览/灵感入口 |
| `appliedFilters` | object | 归一化后的筛选条件（含 page/pageSize），可原样回填 URL |
| `catalogVersion` | string | 目录版本 |
| `pantryRevision` | number | 当前 pantry revision（等于快照 revision，供乐观并发参考） |

每条候选的可解释字段 / Explainability fields per candidate:

| 字段 | 说明 |
| --- | --- |
| `recipeId` / `title` / `titleZh` | 菜谱标识与展示名 |
| `group` | `staplesReady`（主食材齐全）· `partialMatch`（部分匹配）· `checkUnits`（含单位待核对） |
| `stapleTotal` | 必需主食材种类总数（role=food；去重后） |
| `sufficientKinds` / `insufficientKinds` / `missingKinds` / `unitCheckKinds` | 数量足够 / 不足 / 完全缺少 / 单位待核对的种类数 |
| `ownedKinds` | 已拥有种类数 = sufficient + insufficient + unitCheck（库存量 > 0 即算拥有，但单位不可比不算足够） |
| `sufficientRatio` / `ownedRatio` | 精确分数 `种类数/stapleTotal`；**只基于主食材**，不得表述为营养适配或算法准确率 |
| `staples[]` | 每种主食材明细：`ingredientId`、`required[{unit,quantity}]`（同 ID 按单位合并后）、`pantryQuantity`/`pantryUnit`（无库存为 null）、`state`（`sufficient`/`insufficient`/`missing`/`unitCheck`） |
| `missingSeasonings[]` | 缺少的必需调料 `{ingredientId,quantity,unit}`；同单位按库存扣减出缺口，单位不可比或缺货时报全量。**`group=staplesReady` 且该数组非空时必须提示「主食材齐全，仍缺调料」，不得标为「全部用料足够」** |

## 3. 候选与排序规则 / Candidate and ordering rules

1. **候选生成**：仅当菜谱至少一种必需主食材（`role='food'`）在库存中数量 > 0 才成为候选；调料不参与候选生成、覆盖率和排序；数量为 0 的库存行不算命中。
2. **合并需求**：同 ID 用料先按单位合并（分单位整数运算），不重复计分。
3. **逐 ID 状态**：单位相同且库存量 ≥ 需求量 → `sufficient`；单位相同但不足 → `insufficient`；无库存 → `missing`；有同名食材但单位不可比 → `unitCheck`（永不视为足够）。不混加 g/ml/piece。
4. **分组**：任一 `unitCheck` 即入 `checkUnits`（待核对标志优先决定分组）；否则全部 `sufficient` → `staplesReady`；否则 `partialMatch`。
5. **排序**：`staplesReady` → `partialMatch` → `checkUnits`；组内依次按 `sufficientRatio` 降序、`ownedRatio` 降序、`missingKinds` 升序，最后以稳定 `recipeId` 升序收尾。输入顺序不影响输出（确定性）。
6. 独立的「全部用料足够/缺料/单位待核对」状态仍用**全部必需用料**计算（既有 V1 规则）；推荐评分不改采购算法、缺口计算与多菜合并。

## 4. 页面消费约定（P02 / Peng） / Page consumption notes

- 空态：`hasStapleMatch=false` 显示「暂无主食材匹配」，提供录入库存、浏览全部、每日灵感入口。
- 分组标签与排序即接口顺序，前端不得二次排序或本地重算缺口/比例。
- 「已有 X/Y 种主食材」用 `ownedKinds/stapleTotal`；数量缺口逐条读 `staples[].state` 与 `required` vs `pantryQuantity`。
- `checkUnits` 组候选可展示候选与待核对原因（`staples[].state='unitCheck'`），不能当作数量足够。
- 筛选变化通过 `appliedFilters` 回填 URL，返回/刷新保留条件。

## 5. 实现与交接边界 / Implementation and handover

- 纯计算模块：`src/recommend-by-staples.js`（`recommendByStaples` / `classifyStaples` / `collectRequirementNeeds`），无 IO、无状态。
- 共享筛选：`src/discover-recipes.js` 新增导出 `filterRecipes`（从 `discoverRecipes` 提取的纯重构，行为不变），推荐与发现共用同一谓词，避免两套筛选实现漂移。
- 服务入口：`server/services/store.js` 只读方法 `recommendations(query)`；路由 `GET /api/recommendations/staples`（Hao 复核此集成：无事务入口、不触发表写入，`INVALID_FILTER` → 400 映射与 `/api/recipes` 相同）。
- **无 schema 变更**：不新增迁移，`schemaVersion` 仍为 4；与 H02 的持久化/恢复工作无交集。
- 如 Hao 后续为每日灵感接路由（E1），建议复用同一 `parseRecipeFilters`/`filterRecipes` 入口。

## 6. 测试矩阵 / Test matrix

| 场景 | 断言 | 文件 |
| --- | --- | --- |
| 重复 ID 按单位合并、不重复计分 | `staples.size=2`，合并量 2 piece；库存 1 < 合并 2 → insufficient | `tests/recommend-by-staples.test.js` |
| 只有调料/空库存/数量 0 → 非候选 | `total=0`、`hasStapleMatch=false` | 同上 |
| 逐 ID 状态与精确比例（手算 1/3、2/3） | `sufficientRatio`、`ownedRatio`、`staples[]` 明细 | 同上 |
| 主食材齐全仍缺调料 | `staplesReady` + `missingSeasonings` 缺口（含部分缺口 1/2 g、单位不可比报全量） | 同上 |
| 单位待核对优先分组、不算足够 | `checkUnits`、`unitCheckKinds=1`、`sufficientKinds` 不含待核对项 | 同上 |
| 组序、组内比例序、缺失数序、稳定 ID | `ready-gap > same-1 > same-2 > mostly-missing > dup-merge > unit-issue` | 同上 |
| 小数聚合 0.1+0.2=0.3（分单位运算） | 合并量精确 0.3；0.29 → insufficient | 同上 |
| 输入顺序不影响输出 | 反转输入 `deepEqual` | 同上 |
| 真实目录端到端（sample pantry：egg 2、tomato 1） | `total=43`；前二 `scrambled-eggs`/`steamed-eggs`；tomato-eggs 明细；调料不进 staples | `tests/api/recommendations.test.js` |
| 共享筛选与 400 校验 | `countries=cn` 8 条、`q=steamed` 1 条、三种非法参数 400 `INVALID_FILTER` | 同上 |
| 单位待核对 HTTP 路径 | tomato 500 g → `checkUnits` | 同上 |
| 只读、确定性、revision 稳定 | 两次 GET `deepEqual`；快照前后 `deepEqual` | 同上 |
