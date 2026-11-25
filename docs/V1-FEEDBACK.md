# V1 / 第一轮试用观察与交接记录

- **被测应用基线 SHA**：`14e64b361ac95dc1772b9b25a34cffae49d140cd`（第一轮共享 `main` 基线）
- **关联跟踪单**：[#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12) · [#9](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/9) · [#13](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/13)
- **第一轮实际外部真实用户参与人数**：**`0`**（目标 5 人；无提示独立完成率：**`N/A（0/0）`**）。按 `#12` 与 `#9` 诚信口径如实登记第一轮样本缺口，不以开发者技术检查或模拟数据替代真实用户试用。

---

## 标准试用任务（供第二轮外部真实用户执行与复测）

给外部参与者同一起点“两蛋一番茄”（从首页点击 `Use sample pantry`），不给按钮提示：
1. 找一道现在就能直接做的菜；
2. 选一道缺料的菜加入购物清单，并说出需要买什么、买多少；
3. 修改库存或追加第二道菜并刷新页面，确认是否理解已保存状态与缺口变化；可自由搜索或组合筛选其他菜谱。

建议至少 4/5 无提示完成；始终按实际 `completed / participants` 报告，不因人数不足自动视为通过。

| 匿名编号 | 被测 SHA / 日期 / 环境 | 是否无提示独立完成 | 首次卡点 / 误判 | 清单预期 vs 实际理解 | 严重级别 / 关联 Issue |
| --- | --- | --- | --- | --- | --- |
| 待第二轮招募（第一轮实测外部用户：0） | — | — | — | — | 缺口已登记于 [#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12#issuecomment-7121601843) |

---

## 第一轮本机单设备走查记录（非外部真实用户试用）

2026-11-24，`@Justmao1` 在单台本地 macOS 设备（`http://127.0.0.1:3000`，桌面 Chromium `1440×1000`，Antigravity AI 协助）上对固定基线 `14e64b361ac95dc1772b9b25a34cffae49d140cd` 执行了端到端界面走查与代码核验。该走查仅用于复现真实界面缺陷，**不计入外部真实用户样本数**。

已复现并另开 Issue 纳入第二轮 E4 修复与复测的真实 UI 缺陷：

| 缺陷 Issue | 涉及位置 | 现象与严重级别 | 主责与第二轮复测计划 |
| --- | --- | --- | --- |
| [#20](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/20) | `web/pages/Recipes.jsx:52` | `<details className="discovery-panel" open>` 默认展开 40 项筛选框，在桌面首屏遮挡菜谱卡片与 `Can make now` 标签（`confusing`） | 指派 `@kekepepe` 修复、`@Lsiav` 审批；修复后由 `@Justmao1` 在第二轮新 SHA 上做同任务复测并开展外部真实用户试用 |
| [#21](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/21) | `web/components/ui.jsx:28` | 多缺料菜谱卡片的 `.recipe-status` 使用 flex gap 且将 `', '` 置于后一项开头，导致逗号前多空格及换行行首孤立逗号（`confusing` / 排版缺陷） | 指派 `@kekepepe` 修复、`@Lsiav` 审批；在 `1440×1000` 与 `375×812` 视口及第二轮试用中验证 |

其他非阻塞观察（暂记入待办，级别 `convenience`）：
- 库存页无调料时，`调料 / Seasonings` 分组（`web/pages/Pantry.jsx:57`）下方无空状态提示；
- `2 piece` 等单位单复数格式及 286 项原生 `<select>` 下拉框检索便利性。

---

## 样本局限与第二轮衔接

- 第一轮已完成干净目录技术复现（[#11](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11)）与性能基线实测（[#17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17)），但外部真实用户试用样本仍为 `0`，且未覆盖 Safari、Firefox 与手机真机。
- 第二轮将在 `#20` / `#21` 合入后保持相同初始库存（两蛋一番茄）、标准任务与已登记视口开展外部真实用户试用；若外部参与者仅测试第二轮修订版本，则将其结果与第一轮本机开发者走查分开报告，不宣称测得真人前后对比改善。后续将与双平台离线安装包（P06/M06/H06）及两轮对比数据一并归档；详见 [第一轮成果评审、复盘与证据索引](iteration-1-evidence-and-retrospective.md)。
