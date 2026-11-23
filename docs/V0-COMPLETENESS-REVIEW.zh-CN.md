# V0 完成度复核与 V1 入口

日期：2026-11-06（Asia/Shanghai）。复核方式：当前代码、GitHub 只读记录、自动检查及真实浏览器操作。由 Codex 协助复核，不代表另一成员独立复现或真实目标用户评价。

## 1. 结论

**V0 的核心交互原型已实现，自动检查通过，可以作为 V1 的代码基线；项目交接与用户评价尚不能全部标为完成。** 不使用单一完成百分比：功能实现、技术验证、团队证据和真实试用是不同的完成条件。

V1 应在此基础上增加服务与持久化，具体见 [完整开发计划](V1-DEVELOPMENT-PLAN.zh-CN.md)。不需要重写现有全部页面。

## 2. 实际复核的版本

- 正式仓库位于 `workspace/Smart-Recipe-Pantry-Planner/`；上层 `software/` 是课程资料目录，不是 Git 仓库。
- 当前工作分支为 `task4/demo-verification`，HEAD `c5f3f493114b8244c649488c0fdaf80c10c5caab`；本地 `main` 仍在旧提交，不能直接以本地 main 代表最新版本。
- 通过 GitHub 读取远端 main，并执行 `git fetch origin`，核对到 `c36b65562282c011ea43350381c84d8214f1fb42`。
- HEAD 与此次远端 main 的文件差异仅为新增 `tests/calculate-shortages-regression.test.js` 和 `docs/task4/changpeng-regression.md`。运行页面、纯规则、依赖、构建配置及 CI 完全相同。
- 当前工作分支实际运行测试/demo/build；另用 `git archive origin/main` 导出临时副本，直接运行最新 main 的测试和 demo。后者不是第二成员 clean clone。
- 原有未跟踪文件 `docs/task4/kepeng-check.md` 保留不动；此次没有切换分支、提交、推送、发布评审或修改远端 Issue。

## 3. 按 V0 范围检查实现

| 范围 | 当前代码证据 | 判断 |
| --- | --- | --- |
| 首页与导航 | Home、App、AppProvider；样例和空库存入口、统一快照、确认重置 | 已实现 |
| 库存 CRUD | Pantry；规范食材、总量覆盖、输入错误、确认删除 | 已实现 |
| 菜谱列表与详情 | Recipes、RecipeDetail；筛选、需求/已有/缺口、步骤、返回位置 | 已实现 |
| 匹配规则 | evaluate-recipe、calculate-shortages；按 ID、缺失为零、精度、单位核对 | 已实现并有自动断言 |
| 单菜购物清单 | mock-client、Shopping；选择幂等、库存变更重算、不扣库存 | 已实现并有自动断言 |
| 错误与边界 | 模拟保存失败、草稿保留、空库存、无需采购、单位不兼容 | 规则/状态测试通过；历史浏览器记录覆盖更多边界 |
| 手机与键盘 | 响应式样式、语义控件、对话框与焦点管理 | 历史记录覆盖键盘；本轮复核桌面及手机核心页面，未重做完整无障碍评估 |
| 运行与构建 | 锁文件、Node 基线、Vite、CI、运行手册 | 当前检查通过 |
| 独立交接与试用 | V0-FEEDBACK、Task 4 evidence | 存在证据缺口，见第 6 节 |

数据规模为五种规范食材和两道单食材演示菜谱，符合既定 V0 小范围原型目标。它尚不足以验证日常菜谱覆盖率或复杂多食材 UI；V1 需补充至少一道多食材验收菜谱。

## 4. 本轮实际检查

环境：macOS arm64、Node.js 22.23.1、npm 10.9.8。没有重新安装依赖；构建使用已有 node_modules，因此本轮不宣称验证了干净安装。

| 检查 | 结果与范围 |
| --- | --- |
| 当前 HEAD `npm run test:final` | 16 pass，0 fail，0 skipped，0 todo |
| 最新 main 临时导出 `npm run test:final` | 21 pass，0 fail，0 skipped，0 todo，退出 0 |
| 当前 HEAD / 最新 main `npm run demo` | AC1–AC5，5/5 passed，退出 0 |
| `npm run build` | 成功；JS 245.54 kB / gzip 76.37 kB，CSS 11.84 kB；与最新 main 的应用/构建源码一致 |
| `git diff --check` | 通过 |
| 最新 main GitHub Actions | [run 42182136651](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42182136651)，SHA `c36b655`，completed/success |

原 [V0 技术验收](V0-ACCEPTANCE.md) 的 16 项结果是早期时间点，不需要改写为 21。新增的五项回归已在最新 main 单独核对通过；过去的执行记录保留其原本版本与范围。

### 浏览器复核

目标路径：入口 → 使用两蛋一番茄 → 番茄菜详情 → 生成清单 → 重复生成 → 库存番茄改为 2 → 清单无需采购。

环境：本地开发地址 `http://127.0.0.1:5173/`；桌面 1440×1000、手机 375×812。Browser plugin 的 browser 技能未在本会话提供，因此使用 Playwright CLI（Browser plugin not available），没有修改依赖或创建提交到仓库的浏览器测试。

| 检查 | 实际观察 | 结果 |
| --- | --- | --- |
| 页面身份与非空 | Pantry & Plate · Smart Recipe and Pantry Planner；首页与菜谱内容正常 | 通过 |
| 错误覆盖层 | 页面没有框架错误覆盖层 | 通过 |
| 初始匹配 | 鸡蛋 2 可做，番茄需要 2、已有 1、缺 1 | 通过 |
| 清单与重复生成 | 两次生成后清单均为 Tomatoes 1 piece，没有累加 | 通过 |
| 库存联动 | 番茄保存为 2 后，所选清单显示 Nothing to buy | 通过 |
| 手机布局 | 375×812 购物页正常；document.scrollWidth 与 innerWidth 均为 375 | 通过 |
| 控制台 | 本次浏览器会话 Errors 0、Warnings 0；React DevTools 提示属于 info | 通过 |
| 刷新边界 | 购物页刷新后呈现首页入口，原库存/选择不保留；地址 hash 仍可保留原值 | 符合 V0 内存原型范围 |
| 截图检查 | 桌面菜谱与手机无需采购状态清晰，未见所检页面的遮挡或水平溢出 | 通过 |

本轮不将旧记录中的全量键盘、错误注入、删除等浏览器用例冒充为重新执行；相关规则与状态由当前自动测试覆盖。未重新验证 Safari、Firefox、真实手机、完整屏幕阅读器或生产静态预览。此次只改文档与入口说明，没有修改产品代码。

本轮截图留存在聊天的本地可视化目录（v0-review-desktop.png、v0-review-mobile.png），不随源码提交；仓库既有界面截图见 README。

## 5. 远端协作实际进度

| 活动 | 2026-11-06 核查结果 |
| --- | --- |
| Peng V0 [PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3) | 已合并 |
| Feng CI [PR #2](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2) | 已合并；Windows 验证记录仍需按其原范围理解 |
| Peng demo [PR #4](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/4) | 已合并；ChangPeng 有 [具体批准评审](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/4#pullrequestreview-5796759873) |
| ChangPeng 回归 [PR #5](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/5) | 已合并；读取到 Feng 的批准，正文为 OK；此次读取未见原计划的 Peng 具体评审 |
| 最新集成 main CI | 成功，见第 4 节 |
| [Issue #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1) | 已关闭，但关闭声明与 main 的 evidence 文档不一致 |

## 6. 尚未闭环的内容

### 证据与状态存在矛盾

[Issue #1 的完成声明](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1#issuecomment-6679027056) 称 clean-clone、贡献证据和复盘已经写入 `docs/task4/evidence.md`。但此次核对的 main `c36b655` 中，该文件仍将最终 SHA/CI、Mao 独立复现、实际验收、复盘等列为 pending，仍把已合并 PR 写成旧状态；也未见所要求的 `zhekai-reproduction.md`。

因此可以确认代码集成与 CI 已完成，但无法仅凭关闭 Issue 确认所有课程协作条件都已满足。这是可追溯证据缺口，不据此推断成员线下没有做过。需要 Mao 提供真实记录并通过文档 PR 更新最终证据；若记录尚未形成，实际执行后再填写。此次不代替成员填写、重开或关闭远端 Issue。

### 真实用户评价仍未有结果

main 的 `docs/V0-FEEDBACK.md` 仍标记参与人数 0，未见匿名任务记录。现有技术验收不能证明建议的 4/5 无提示完成率。需要记录实际人数、版本、首次卡点、误判、清单正确性与复测，不能用“完成率 80%”代替尚未发生的试用。

### 文档入口需要同步

旧 README / workspace 说明仍将 V0 写成仅在开发分支、尚未合入 main；部分 Task 4 文档仍把已合并任务写为待执行。此次更新中英文 README 的入口和 workspace 概况，新增当前复核与 V1 计划；保留历史验收和成员原记录，由最终证据 PR 统一补充事实。

## 7. V1 需要新增的能力

源码 `web/services/client.js` 仍直接创建 `createMockClient()`；mock 数据位于闭包内，刷新即丢失。没有服务端入口、数据库迁移、HTTP client、真实存储失败验证或认证隔离。

这些是 V1 的计划工作，不能计作 V0 缺陷或现有能力：

- 库存、菜谱目录、单菜选择及清单条目的持久化。
- HTTP 边界的权威校验、规范单位与服务端重新计算。
- 库存与清单同事务更新、版本冲突及网络不确定结果处理。
- 刷新/服务重启恢复、真实失败回滚、备份与独立环境恢复。
- 首次使用语义调整，避免 V0 reset 覆盖真实库存。
- 若开展多人共享试用，再单独交付身份、空间隔离、HTTPS 与托管运维。

## 8. 优先处理顺序

1. Mao 补齐或实际执行独立复现与最终验收，修正 Issue 声明和 evidence 的对应关系；Peng 核对回归 PR 的评审要求是否已满足。
2. 招募真实试用并记录实际结果；现有原型可直接用于该任务。
3. 按 V1 计划从最新 main 开始，Day 1 冻结合同并建立服务和数据库。
4. 先交付可保存且可恢复的 P1–P4，再评估多人共享试运行和 V2 增强。
