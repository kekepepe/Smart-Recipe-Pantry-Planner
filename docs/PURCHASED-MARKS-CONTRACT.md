# 已购标记接口契约（C02）/ Purchased Marks Interface Contract

> 工作包：**C02 已购状态业务服务**（10.2，ChangPeng → ChangPeng，链接 H02，提及 @kekepepe、@fhhhz-todd）。
> 本契约是 C02 PR 的随附交付物：前端（P03，@kekepepe）按"前端所用接口与行为"审批；H02（@fhhhz-todd）按"持久化与冲突"主审，并对第 5 节的持久化硬化项做接管或确认。

## 1. 数据模型（schema 004）

- 新增独立表 `purchased_marks(workspace_id, ingredient_id, unit, expected_quantity_minor, marked_at)`，主键 `(workspace_id, ingredient_id, unit)`；
- **不级联挂在派生行上**：只引用 `workspaces(id)` 与 `ingredient_units(ingredient_id, unit)`，绝不引用会被重建的 `shopping_lists` / `shopping_list_items` / `shopping_selections`——重建购物清单不可能静默丢改标记（H02 要求）；
- `expected_quantity_minor`：标记时刻的**应采购量**（整数 minor 单位，quantity×100），带与 001 相同的取值/单位 CHECK；
- 迁移 004 纯增量，不修改 001/002/003 历史迁移；`schemaVersion` 3→4。

## 2. API

| 方法与路径 | 请求体 | 成功 | 说明 |
| --- | --- | --- | --- |
| `PUT /api/purchased-marks/:ingredientId` | `{ unit, expectedQuantity, expectedRevision }` | 200 + 快照 | 勾选已购。`unit` 必须在该食材的 `allowedUnits` 内；`expectedQuantity` 必须 > 0、至多两位小数，且**逐字等于**当前聚合需求量 |
| `DELETE /api/purchased-marks/:ingredientId` | `{ unit, expectedRevision }` | 200 + 快照 | 撤销勾选。**幂等**：撤销不存在的标记返回 200，仅 revision +1 |

两接口均复用全局写路径约束（`application/json`、`shape` 字段白名单、`expectedRevision` 乐观并发），响应为完整新快照。

### 快照新增字段

```json
"purchasedMarks": [
  { "ingredientId": "egg", "expectedQuantity": 3, "unit": "piece", "markedAt": "2026-11-25T03:00:00.000Z" }
]
```

排序确定性：按 `(ingredientId, unit)` 字典序——与购物清单缓存的确定性要求一致。

### 错误码

| 状态 | code | 触发条件 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | 字段白名单外/缺 `expectedRevision`/非法 revision |
| 404 | `NOT_FOUND` | `ingredientId` 不在目录 |
| 409 | `REVISION_CONFLICT` | `expectedRevision` 过期（沿用全局 revision 机制，无新冲突机制） |
| 422 | `VALIDATION_ERROR` | 单位不在 `allowedUnits`；数量非法（0、负数、超界、超两位小数） |
| 422 | `NO_ACTIVE_LIST` | 当前无选菜清单时勾选 |
| 422 | `PURCHASED_MARK_NOT_REQUIRED` | 该 `(ingredient, unit)` 不在当前聚合需求中 |
| 422 | `PURCHASED_MARK_STALE` | `expectedQuantity` 与当前聚合需求量不一致（清单已变化） |

## 3. 标记协调规则（需求变化与冲突）

标记在勾选时刻绑定三元组 `(ingredientId, unit, expectedQuantity)`；**任一次购物清单重算**（选菜/撤菜/清空/库存写入，均在 `write()` 事务内）按下列规则协调：

| 当前聚合需求 | 结果 |
| --- | --- |
| 存在且三元组逐字一致（同食材、同单位、同数量） | **保留** |
| 数量变化（任意方向，如新增菜谱使 egg 3→5） | **取消** |
| 单位不再被需求（同食材换单位） | **取消** |
| 需求归零/消失（撤菜、清空） | **取消**；被取消的标记**物理删除，永不自动复活**——需求恢复后须用户重新勾选 |

无关变更（其他食材/菜谱的变化）不影响本标记。协调在 `rebuildShopping()` 内执行，与清单缓存、revision 递增同事务，**事务失败整体回滚**（含 fault 注入路径）。勾选本身即受协调保护：标记后立刻重算，若与需求不一致会在同一事务内被取消，不可能出现"标记与清单矛盾"的持久状态。

## 4. 不变量（供 H02 主审与 P03 审批对照）

1. 标记表行数 ≤ 当前聚合需求条目数（协调后）；
2. 每个存续标记的三元组与当前聚合需求逐字一致；
3. 任何 2xx 写响应后，快照内 `purchasedMarks` 与库表逐字一致（无缓存层）；
4. 撤销幂等；勾选同一三元组幂等；
5. 冲突仅通过 `expectedRevision` 表达，不引入第二套并发机制；
6. `purchased_marks` 不参与 `pantry_version`（库存版本不变），但任何勾选/撤销使 `revision` +1。

## 5. 移交 H02（@fhhhz-todd）的持久化硬化项

本 PR 附带**满足契约的最小 schema 004**（纯增量、独立表、CHECK 与外键齐全），使 C02 可端到端测试。H02 PR 接管时须保持或强化（不得放宽）：

1. 表结构不变式（独立于派生行、复合主键、`expected_quantity_minor` 约束）；
2. `rebuildShopping()` 内的同事务协调入口（本 PR 已提供；如 H02 改为"协调入口由持久层提供"，须保持逐字一致语义并迁移本 PR 的全部夹具）；
3. `backup`/`restore`/`repair` 路径对 `purchased_marks` 的覆盖（当前由既有全库机制自然覆盖，H02 须补充显式断言）；
4. 营养来源/映射表按 H02 自身范围另行迁移（编号建议 005 起），**不修改本 PR 的 004**。

## 6. 测试矩阵（C04 独立手算夹具）

| 场景 | 测试 |
| --- | --- |
| 精确匹配保留 | `tests/purchased-marks.test.js`（reconcile: exact match） |
| 数量增/减取消 | reconcile: quantity change × 2 |
| 单位不再需求取消 | reconcile: unit no longer demanded |
| 归零取消且不复活 | reconcile: dropped to zero + store: re-select never revives |
| 无关变更保留 | reconcile: unrelated changes + store/API: pantry top-up keeps marks |
| minor 单位精确性（0.1+0.2 聚合 vs 0.3 标记） | reconcile: minor-unit exactness |
| 勾选/撤销/幂等/revision 纪律 | API: mark, snapshot echo, unmark and revision discipline |
| 需求变化协调（API 全链路） | API: requirement change cancels stale mark |
| 清空清单全取消、不复活 | API: clearing the list drops every mark |
| 事务失败回滚（fault 注入） | store: transaction fault + API: transaction fault |
| 非法输入全拒（404/409/422 × 7） | store: mark validation + API validation block |
| 迁移 001→004 数据保留、重复迁移幂等 | integration: multiple-recipes（001→004）、persistence（A15） |
