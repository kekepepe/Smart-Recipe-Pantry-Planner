# Smart Recipe and Pantry Planner V0 技术选型与搭建计划

实施状态更新：正式 clone 已位于 `workspace/Smart-Recipe-Pantry-Planner`，V0 技术基线已搭建；本计划中的“当前状态”指实施前的核对结果。最新运行、检查与未完成交接见 [运行手册](V0-RUNBOOK.md) 和 [技术验收](V0-ACCEPTANCE.md)。

编写日期：2026-11-06。状态：待团队评审的实施方案；本文件不代表应用、测试或团队协作已经完成。

## 1. 结论与目标

建议采用 **React + Vite + JavaScript + 原生 CSS**，在现有 Node.js ESM 仓库中增量增加前端。V0 使用固定菜谱和可重置的内存状态，完成“录入库存 → 浏览匹配菜谱 → 查看缺口 → 生成单道菜购物清单”的可交互原型。

V0 建议安排在正式迭代之前，用约 **3 个准备日、24–36 人时**完成搭建、集成、复核和一轮试用。该数字是四人团队的工作量估算，不是课程截止时间或完成保证；用户招募等待时间另计。先在第 2 个准备日结束时形成可演示版本，再用第 3 个准备日修复和验证。

V1 沿用前端、数据约定和纯计算函数，增加 **Express 单一应用服务 + SQLite 持久化数据库**；V2 按 Task 3 增加多菜购物、每日灵感、热量估算和反馈改进。技术栈先作为候选实施，第 1 个正式工作日检查 V0 后由团队确认，符合 Task 3 的决策顺序。

本次交付仅为计划。搭建命令、文件结构、接口、工时和验收项均为后续实施约定。

## 2. 已核对的依据与优先级

已通过 GitHub 连接器检查 [main 分支](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/tree/main)，并将本地文件按 Git blob SHA 与远端目录记录比对。Task 2 中英文文件、Task 3 Final、PRD 中英文、V0-team、Task 4 骨架及 package.json 均一致。两个本地 README 比远端少 Task 4 入口，已读取远端内容核对。

当前本地工作目录没有 `.git`，因此不能在这里直接执行分支、提交和推送；开始实施时应使用正式 clone，并复制或提交本计划。不要在当前目录重新初始化一个与远端无关的仓库。

| 依据 | 对本计划的约束 | 本计划如何落实 |
| --- | --- | --- |
| [Task 2 英文规划](../Smart_Recipe_and_Pantry_Planner_Project_Planning_Revised_task2.docx)，第 2、5 节 | 迭代增量开发；V1 核心流程、V2 增强功能；两个版本分别可演示 | V0 为准备基线，保留 V1/V2 范围 |
| [Task 2 中文规划](../Smart_Recipe_and_Pantry_Planner_Project_Planning_CN_Revised_task2.docx) | 用户、问题与范围的中文依据 | 面向家庭烹饪者、学生和上班族，优先解决库存核对与采购 |
| [Task 3 Final](../Smart_Recipe_and_Pantry_Planner_Task3_Project_Plan_Final.docx)，第 2–6 节 | 四人职责、优先级、两个五工作日迭代、完成标准、单服务单数据库 | 保留责任人和十工作日排期；V1 由服务处理校验与计算 |
| [中文 PRD](PRD.zh-CN.md)，第 2 节 | V0 的交互、示例、重置、小屏和键盘要求 | 设计四个任务页面、两个入口和状态处理 |
| [V0 四人分工](V0-team.md) | V0 在正式迭代之前准备；分工与交接 | 采用原有四人职责，安排交叉评审与干净环境复现 |
| [Task 4](task4/README.md) 与 [T4-01](task4/requirement.md) | 单道菜缺口函数、真实断言、CI、独立贡献证据 | 先完成依赖，保留接口和各成员真实贡献 |
| [远端 README](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/blob/main/README.md) | 完整应用仍待开发；初始化替代原有 V0 review 前提 | 先补 V0，再进入正式 Day 1 评估 |

发生理解冲突时，以 Task 2 的产品范围和 Task 3 Final 的交付要求为准，PRD 补充交互细节。本计划补充具体实施方式，不修改课程任务原文。`Task3_Project_Plan_Visual.docx` 是本地参考版本，未作为替代 Final 的依据。

核对版本标识：Task 2 英文 blob `d46f384652caa73b1b22ead6640ceb80da7195c4`；Task 3 Final blob `2da540c5b0e6ecb28dc56bb43267f5a07b3e2d64`。这些是文件 blob SHA，不是分支提交 SHA。实施前应重新拉取 main 并记录实际提交 SHA。

### 当前能复用什么

- 根目录 package.json 已采用 `type: module`，要求 Node.js >=22，已有 `demo`、`test`、`test:final`。
- `src/calculate-shortages.js` 已定义输入输出合同，但函数仍抛出 `TASK4_NOT_IMPLEMENTED`，尚不可运行。
- `tests/calculate-shortages.test.js` 只有导出检查和五个 TODO。2026-11-06 本地执行结果为 **1 pass、5 todo**，不代表五个验收条件通过。
- `docs/task4/ci.example.yml` 是工作流示例；已检查的 main 根目录没有 `.github`，不能当作已启用 CI。
- 可复用需求、接口合同、样例与协作骨架；当前没有可复用的前端、服务或数据库框架。

## 3. V0 的交付边界

| V0 必须实现 | 具体行为 |
| --- | --- |
| 首页两个入口 | “使用示例库存”加载两蛋一番茄；“自己添加”进入空库存 |
| 库存增删改查 | 从规范食材列表选择食材，编辑数量和单位；删除须确认 |
| 菜谱列表与详情 | 至少两道人工核验的示例菜谱，展示需求、数量、单位、步骤 |
| 动态匹配 | “现在可做”“补齐后可做”“请核对单位”；库存修改后重新计算 |
| 单道菜购物清单 | 展示最新缺口；重复添加同一道菜不翻倍；生成清单不扣库存 |
| 原型状态与重置 | 页面切换保留本次操作；可恢复“两蛋一番茄”或清空库存 |
| 基础体验验证 | 空状态、输入错误、失败与重试、小屏、键盘操作、返回状态 |
| 交接证据 | 启动说明、真实验收记录、一次试用记录、V1 待办和第二成员复现 |

V0 不实现账号、数据库、公网部署、多人隔离、菜谱编辑后台、每日灵感、热量、多菜合并、已购勾选和临期提醒。不为后续功能增加无法使用的入口。V1/V2 的原定要求保持不变。

**存储说明：** V0 数据仅在当前页面运行期间保留，刷新或重新打开后回到入口；页面持续提示“演示模式，刷新后重置”。不把页面切换时的状态保留称为持久化。V1 必须另行验证刷新和服务重启恢复。

## 4. 技术栈及取舍

| 层次 | 建议选择 | 为什么适合本项目 |
| --- | --- | --- |
| 运行环境 | Node.js 22 的受维护补丁版本，至少 22.12；npm | 保留现有 Node 22 路线，满足当前 Vite 文档的最低要求；锁定团队实际验证的完整版本 |
| 构建与开发 | Vite，使用 React JavaScript 模板的配置方式 | 热更新、静态构建和本机预览；无需先建立服务 |
| 页面 | React + JavaScript，函数组件 | 四个页面可拆给两位成员；后续接 API 时复用组件 |
| 样式 | 原生 CSS，统一变量、Flex/Grid | 降低依赖；用少量布局和表单样式完成桌面与手机浏览器演示 |
| 导航 | hash 路由与一层轻量导航封装 | 四个任务页面足够；返回事件可明确处理，静态预览不需要服务端路由回退 |
| 应用状态 | 一个 AppProvider，React 内置状态 | 共享库存、匹配和当前清单；避免各页面维护不同库存副本 |
| 数据访问 | 异步 mockClient，固定食材和菜谱数据 | V0 用内存，V1 换 httpClient；页面不依赖具体存储 |
| 规则测试 | 现有 `node:test` 与 `node:assert/strict` | 保留 Task 4 合同和检查命令，补充匹配/清单边界断言 |
| 浏览器验收 | 先执行固定人工冒烟用例 | 页面少，先验证真实操作；V1 再按回归成本增加自动浏览器测试 |
| V1 服务 | Express 5，单进程应用服务 | 一个位置处理校验、匹配和保存；构建后的前端可由同一服务提供 |
| V1 数据库 | SQLite + better-sqlite3，显式 SQL 迁移 | 本地单机无需单独安装数据库服务；以少量表支撑本项目 |

V0 首批只增加 React、React DOM、Vite 和 React 的 Vite 插件。不引入额外状态库、UI 套件、CSS 框架、ORM、容器或实时外部 API。使用 JavaScript 是为了直接复用现有 ESM 函数并减少初始配置；以清晰的数据合同和校验约束输入。

V1 的 Express、数据库驱动在正式 Day 1 再安装和确认。better-sqlite3 在主要平台提供预构建文件，但仍需在团队实际机器验证安装；安装失败时由 HaoZhe Feng 先排查 Node 版本和平台支持，再记录替代驱动决策，不把排障拖入 V0。

版本策略：实施时安装并验证一组兼容版本，提交 `package-lock.json`、记录实际 Node 版本，此后成员使用 `npm ci`。本计划没有安装依赖，不声称某组具体包版本已验证。

技术资料核对于 2026-11-06：[React 从零搭建](https://react.dev/learn/build-a-react-app-from-scratch)、[Vite 环境与模板](https://vite.dev/guide/)、[Express 5 安装](https://expressjs.com/en/5x/starter/installing/)、[better-sqlite3 官方项目](https://github.com/WiseLibs/better-sqlite3)。

## 5. 页面与交互设计

界面采用一个应用标题、三项主导航“我的食材／找菜谱／购物清单”和主内容区。桌面使用横向导航与双列卡片，小屏改为单列；不依赖悬停才可访问的信息。V0 暂用英文作为课程演示界面的默认语言，中文作为计划和说明语言；沿用仓库中英文核心术语，不开发语言切换系统。

| 路由 | 内容 | 关键状态与返回行为 |
| --- | --- | --- |
| `#/` | 简要说明、示例入口、空库存入口 | 重新加载示例会覆盖当前演示数据，先确认 |
| `#/pantry` | 食材选择、数量、单位、库存列表、编辑和删除 | 空库存可去浏览菜谱；错误贴近字段；确认后删除 |
| `#/recipes` | 全部／现在可做／补齐后可做筛选、菜谱卡片 | 每张卡片显示文字状态；未知单位单独提示；筛选与滚动位置保留 |
| `#/recipes/:id` | 配料对照、步骤、生成清单按钮 | 同时展示需要／已有／还差；未知 ID 显示找不到菜谱；返回原列表位置 |
| `#/shopping` | 当前所选一道菜、待购物项、返回修改入口 | 无选择提示选菜；零缺口显示无需购买；重新生成使用最新库存 |

“四个任务页面”指首页、库存、菜谱、购物；详情是菜谱的子页面。

每页共用重置操作。按钮提交中禁用重复操作，完成后用文字反馈；失败保留表单和选择，提供重试。字段有 label，状态反馈使用可访问的 live region；错误不单靠红色，菜谱可做性不单靠绿色。菜单、表单、确认框和返回均可用键盘操作，切换页面后焦点进入页面标题。

删除食材、清空或加载示例可使用浏览器原生确认框，降低自制弹窗成本。数量输入保留草稿，提交验证后才更新共享状态。

## 6. 数据合同与计算规则

### 6.1 最小模型

```js
// 规范食材目录；显示名不参与匹配。
Ingredient = { id: 'tomato', name: 'Tomato', allowedUnits: ['piece', 'g'] }

// 每个 ingredientId 仅保留一条库存记录。
PantryItem = { ingredientId: 'tomato', quantity: 1, unit: 'piece' }

Recipe = {
  id: 'tomato-dish',
  title: 'Simple tomato dish',
  requirements: [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }],
  steps: ['...'],
  source: 'Team-authored demo recipe',
  usageRights: 'Team permission recorded'
}

RecipeEvaluation = {
  recipeId: 'tomato-dish',
  status: 'ready', // ready | needsShopping | checkUnits
  shortages: [],
  unitIssues: []
}

ShoppingSelection = { recipeId: 'tomato-dish' } // V0 同时只选一道菜
```

以上为模型示意，不是可直接运行的代码。来源与使用权要写真实信息；团队自编菜谱由提供者核对步骤、用量并记录同意使用。V0 先准备两道完整演示菜谱：A 需要鸡蛋 2 个；B 需要番茄 2 个。两者构成简化用例，不宣称是真实营养数据库或完整菜谱库。

额外准备一组仅用于验收的单位不兼容数据，例如需要番茄 200 g、库存番茄 1 piece，不必新增对外展示的功能模块。

### 6.2 输入与单位

- 数量必须为有限数值且不小于零；空白、负数、NaN、Infinity 均拒绝。零库存允许保存；`piece` 限整数，`g` 和 `ml` 允许最多两位小数。
- 食材必须来自规范目录，单位必须在该食材的允许列表中；禁止使用显示名、大小写相近字符串作为匹配键。
- 同一食材重复保存采用“设置该食材数量”的覆盖语义，不隐式叠加。界面明确当前值，变更单位也必须重新确认数量。
- V0 只比较完全相同单位，不做任何单位换算。遇到不兼容单位，显示“Check units”，缺口数字显示不可比较，不填零。
- 小数计算按支持的两位精度处理：先规范为百分之一单位的整数，再计算缺口，输出时还原；测试覆盖 0.3 − 0.1 = 0.2。不要对浮点残差直接判定可做性。

### 6.3 复用 T4-01 的方式

`calculateShortages(requirements, pantry)` 保持原合同：输入为规范、无重复、同单位的非负数记录，返回正缺口，顺序与菜谱相同，不修改输入。

先在独立的 `evaluate-recipe.js` 校验食材、数量和单位，再调用该函数。只把**同一道菜所需食材**的相关库存传入；库存里无关食材的单位不会影响匹配。存在单位问题时可以展示已知的比较结果，但整道菜状态必须为 `checkUnits`，且禁止生成不完整的购物清单。

优先级为：存在单位问题 → `checkUnits`；没有单位问题且有正缺口 → `needsShopping`；所有必需食材缺口均为零 → `ready`。缺少库存的食材按已有 0 处理。输入损坏显示数据错误，不进入 ready 分组。

### 6.4 清单与状态一致性

V0 购物页保存所选 `recipeId`，内容从当前库存重新计算。重复选择相同 ID 是覆盖当前选择，不能向数组追加同一批缺口。选择另一道菜替换当前清单，并在按钮或说明中明确一次只保留一道菜。

库存变更后，菜谱分组、详情和已选清单一起更新；不能只刷新当前页面。库存改成两个番茄后，B 应变为 ready，购物页同步显示无需购买。生成清单和浏览菜谱都不减少库存，返回列表保留筛选与滚动位置。

## 7. 最小架构与文件布局

V0 数据流为：**React 页面 → 统一 client 接口 → 内存数据与纯规则 → 返回最新快照 → AppProvider 更新页面**。

页面不直接 import 示例数据、不直接修改共享数组，也不各自计算缺口。mockClient 返回 Promise，使页面提前处理 loading、失败和重试；V1 换成 HTTP 后无需改变页面事件的调用方式。无需提前构建通用仓储框架或依赖注入系统。

```text
项目根目录
├── package.json                 保留原有 scripts，新增前端 scripts
├── package-lock.json            实施后生成并提交
├── .nvmrc                       实施时固定完整 Node 22 版本
├── .gitignore                   node_modules、dist、数据库与本地配置
├── index.html                   Vite 入口，根目录作为 Vite root
├── vite.config.js               React 插件；默认只监听本机
├── src/
│   ├── calculate-shortages.js    保留 Task 4 路径及导出合同
│   └── evaluate-recipe.js        新增校验、精度和匹配状态封装
├── web/
│   ├── main.jsx
│   ├── App.jsx                  布局、hash 路由与返回处理
│   ├── AppProvider.jsx          加载快照、调用 client、处理共享状态
│   ├── styles.css
│   ├── components/              Nav、QuantityField、RecipeCard、StatusText
│   ├── pages/                   Home、Pantry、Recipes、RecipeDetail、Shopping
│   ├── services/
│   │   ├── client.js            导出当前使用的客户端
│   │   └── mock-client.js       内存状态、重置和模拟失败
│   └── data/                   ingredients、recipes 与样例库存
├── tests/
│   ├── calculate-shortages.test.js  原有五个 TODO 应转为真实断言
│   ├── evaluate-recipe.test.js
│   └── shopping-selection.test.js
├── examples/shortages-demo.js    保留
├── scripts/check-complete.js     保留
├── docs/
│   ├── V0-IMPLEMENTATION-PLAN.zh-CN.md
│   ├── V0-RUNBOOK.md             后续编写启动、演示、重置和常见问题
│   ├── V0-ACCEPTANCE.md          后续填写预期、实际、环境与复测
│   └── V0-FEEDBACK.md            后续填写匿名试用和 V1 待办
└── .github/workflows/test.yml    由 Task 4 CI 工作扩展
```

V1 再增加 `server/`、`server/migrations/`、HTTP client 和不入库的数据库文件目录，不在 V0 建空服务。上述名称是建议布局，真正交付以评审合并的文件为准。

### client 的最小接口

| 方法 | 用途 | 成功结果 |
| --- | --- | --- |
| `getSnapshot()` | 初始化和重新加载 | 库存、菜谱、匹配结果、当前单菜选择与清单 |
| `savePantryItem(item)` | 新增或修改，覆盖对应食材 | 操作后的完整快照 |
| `deletePantryItem(ingredientId)` | 删除 | 操作后的完整快照 |
| `selectShoppingRecipe(recipeId)` | 生成或更新单菜清单 | 操作后的完整快照 |
| `resetDemo(mode)` | `sample` 或 `empty` | 重置后的完整快照 |

失败返回统一错误（如 `VALIDATION_ERROR`、`UNIT_MISMATCH`、`SIMULATED_SAVE_FAILURE`），页面保留草稿且不显示已保存。V0 本地验收可通过开发配置注入“一次保存失败”；该配置只在开发模式启用，正式界面不显示技术开关。模拟失败只能证明页面处理，不能作为 V1 数据库失败测试证据。

为减少异步状态竞争，V0 同时只执行一个写操作，提交时禁用相关操作；刷新快照完成后再恢复。mock 数据采用复制返回，避免组件误改底层记录。

## 8. 搭建路线与四人交接

### 准备日 A 约定与可运行骨架

目标：团队在同一数据合同上工作，主导航和本地启动可用。

1. ZheKai Mao 确认页面状态、T4-01 需求和验收任务；当天开始招募试用者。
2. HaoZhe Feng 在正式 clone 的分支中增量配置 Vite、React、启动脚本、版本锁定和忽略文件，不覆盖现有 package.json。
3. Peng Ke 与 ChangPeng Shi 确认食材 ID、单位和样例；Peng 完成库存表单框架，ChangPeng 准备两道菜谱。
4. 按 Task 4 临时分工完成计算实现、真实断言和 CI，再将通过评审的函数接入 V0。页面骨架可先并行搭建，匹配集成必须等此依赖完成。

出口：另一成员可启动空页面；两个入口、导航可操作；T4-01 的五项真实断言与最终检查通过，未完成时明确列为阻塞。

### 准备日 B 完整主流程

目标：形成可演示的 V0。

1. Peng Ke 完成库存新增、编辑、删除、输入提示和页面布局。
2. ChangPeng Shi 完成匹配封装、分组、详情、单道菜清单和重复操作处理。
3. HaoZhe Feng 接入 mockClient、快照更新、重置、错误注入和统一构建；当天至少集成一次。
4. ZheKai Mao 按两蛋一番茄主流程走查；Peng 与 ChangPeng 交叉评审。

出口：完整走通主流程；更新番茄数量后全部相关页面同步；空库存仍可浏览；重置可靠。

### 准备日 C 验证与 V1 交接

目标：修复阻断问题，形成可复现的基线。

1. HaoZhe Feng 执行计算、匹配、清单检查和构建；Peng/ChangPeng 修复问题并复测。
2. 第二位成员在新目录 clone，按手册安装、启动、走流程、重置，记录提交 SHA 与结果。
3. ZheKai Mao 主持一轮目标用户试用，目标为五位；记录实际人数、独立完成数和问题，不能把招募不足写成通过。
4. 全组评审，整理 V1 待办、可复用代码、已知限制和运行说明。

出口：第 10 节验收记录完整，无错误可做判断、错误缺口和阻断操作；若试用门槛未达到，先修正或记录未达标，不把未完成 V0 算作已验收。

### 职责保持原有安排

| 成员 | V0 主要职责 | 交付及复核 |
| --- | --- | --- |
| ZheKai Mao | 需求、状态文案、试用、优先级与评审 | 页面状态表、真实反馈、V1 待办；复核发布证据 |
| Peng Ke | 首页、库存、导航、输入校验、响应式、键盘 | 库存流程；与 ChangPeng 交叉评审 |
| ChangPeng Shi | 菜谱样例、匹配、详情、清单 | 样例预期结果、计算与清单流程；与 Peng 交叉评审 |
| HaoZhe Feng | 环境、集成、自动检查、重置、打包、手册 | 可启动构建、验收记录、第二成员复现；支援集成 |

Task 4 中 Peng 实现函数、ChangPeng 写断言、Hao 配 CI、ZheKai 留证据的临时分工继续有效；它不改变 ChangPeng 对 V0/V1 计算模块的长期职责。各成员使用自己的账号贡献，记录真实 PR、评审与 Actions，不由一个账号代替四人的协作。

## 9. 实施命令与 CI 约定

以下是后续执行顺序，**目前尚未执行安装或搭建**。

```bash
# 在空的新目录中取得正式 Git 仓库，或使用已有的正式 clone。
git clone https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
git switch -c feat/v0-foundation
node --version

# 增量安装，不重新 npm init，不用脚手架覆盖根目录。
npm install react react-dom
npm install -D vite @vitejs/plugin-react
```

然后人工加入入口和配置，保留原有全部 scripts，新增 `dev: vite`、`build: vite build`、`preview: vite preview`。Vite 根目录为项目根目录，前端入口指向 `/web/main.jsx`，因此能直接引用 `src/` 中的纯规则模块。

```bash
# 以下命令在对应配置和实现完成后才可用。
npm run dev
npm run demo
npm run test:final
npm run build
npm run preview
```

提交 package-lock 后，其他成员使用 `npm ci`，再启动和检查。默认仅监听 `127.0.0.1`；小屏通过浏览器设备视口检查即可，V0 不要求暴露局域网服务。静态预览只验证构建后的原型，不提供持久化或多人服务。

CI 先完成 Task 4 工作流，再增加 `npm ci` 和 `npm run build`；保留 `npm run test:final`，使原有五个 TODO 不会被普通测试的零退出码掩盖。新增规则测试同样必须为真实断言，不加入 skip/todo 充数。

分支建议按实际功能拆分 foundation、pantry、recipes、evaluation；每个 PR 写需求链接、修改内容、实际检查结果和评审人。Hao 集成最新 main 后跑最终检查，ZheKai 复核证据。CI 绿灯不能替代浏览器操作和试用记录。

## 10. V0 验收清单

以下都是待执行用例。每项记录提交 SHA、环境、预期、实际、通过与否、缺陷链接和复测结果。

| ID | 操作 | 预期 |
| --- | --- | --- |
| V0-01 | 加载示例库存 | 鸡蛋 2 piece、番茄 1 piece；A 现在可做，B 缺番茄 1 piece |
| V0-02 | 查看 B 详情 | 同屏显示需要 2／已有 1／还差 1，并能查看步骤 |
| V0-03 | 连续两次生成 B 清单 | 只有番茄 1 piece，库存不变 |
| V0-04 | 番茄从 1 改为 2 | B 进入现在可做；已选购物页显示无需购买 |
| V0-05 | 删除番茄，再查看 B | 显示缺番茄 2 piece；删除经过确认 |
| V0-06 | 从自己添加进入，库存为空 | 能浏览所有菜谱，全部所需食材按零库存计算 |
| V0-07 | 输入空白、负数、非有限值或不合法小数 | 字段提示原因，其他输入保留，数据未变 |
| V0-08 | 番茄需求 200 g，库存 1 piece | 提示核对单位，不标可做，不生成不完整清单 |
| V0-09 | 保存同一食材的新数量 | 覆盖为新值，无重复记录或隐式叠加 |
| V0-10 | 筛选、进入详情，再返回 | 保留筛选、列表位置和本次库存 |
| V0-11 | 开发模式注入一次保存失败后重试 | 不提示已保存，草稿保留，重试成功后更新 |
| V0-12 | 只用键盘，以及 375px 和桌面视口走全流程 | 可完成操作、焦点可见、无水平溢出，状态有文字 |
| V0-13 | 重置为示例，再选择空库存入口 | 两种重置结果正确，清除旧选择和筛选 |
| V0-14 | 刷新页面 | 回到入口并重置；用户事先能看到演示模式提示 |
| V0-15 | 第二成员在干净 clone 启动并构建预览 | 按说明复现主流程和重置，留下环境与提交记录 |
| V0-16 | 小数、空缺口、超额库存和输入不变性规则测试 | 数量正确，无浮点残差误判，不修改输入 |

试用任务沿用 PRD：给出“两蛋一番茄”情景，让用户独立选一道现在能做的菜，再为另一道确定待购物项；不给按钮操作提示。建议至少 4/5 无帮助完成。该门槛来自现有规划的建议，尚无实际结果；人数不足时报告实际分子、分母及限制。

任何已知错误可做判断、错误采购量、无法完成核心任务的问题都阻断 V0 交接。V0 不验收数据库、重启恢复、多人权限或真实写入失败，这些必须留到 V1 单独验证。

## 11. V1 与 V2 的连续扩展

### V1 正式工作日 1–5

Day 1 检查 V0，确认复用的组件、纯规则和技术栈；Hao 建 Express 服务、SQLite、版本化 SQL 迁移、独立开发与测试数据库。页面 client 改为 HTTP，服务是校验、匹配和清单计算的权威来源，浏览器不能直接连接数据库。

建议先提供 `GET /api/snapshot`、`PUT /api/pantry/:ingredientId`、`DELETE /api/pantry/:ingredientId`、`PUT /api/shopping-selection`。服务保存后返回新快照；V0 的 reset 接口不直接开放为共享环境中的清空能力。只允许受控本地单人演示时使用固定 demo workspace，后续多人试用必须从认证上下文获取 workspace，不能信任客户端传入的归属。

最小实体为 workspaces、ingredients、pantry_items、recipes、recipe_requirements、shopping_lists、shopping_list_items；库存按 `(workspace_id, ingredient_id)` 唯一。单菜清单按空间及所选菜谱进行幂等更新，在事务中替换条目。记录清单生成时的库存版本，库存修改后标记需要更新并重新计算，防止持久化旧清单误导用户。初始化数据只补充缺失样例，不覆盖用户库存。

Days 2–3 完成 P1–P4 的服务与界面联调；Day 4 检查主流程、单位、无效输入、真实写入失败和数据一致性；Day 5 修复阻断项、演示 V1、执行刷新与服务重启恢复、进行用户评价。此时间安排沿用 Task 3。

共享试运行是有条件的后续步骤：先验证两组凭据的空间隔离、HTTPS、持久磁盘、自启动、备份恢复和负责人；条件不足继续本地受控演示。Mac mini 或云主机的选择不占用 V0 搭建关键路径。

### V2 正式工作日 6–10

Day 6 排序反馈并修核心缺陷；Days 7–8 按 Task 3 顺序实现多菜合并、每日灵感、热量和至少一项反馈改进；Day 9 回归；Day 10 复测、演示、打包并检查迁移与恢复。

- 多菜购物先汇总需求，再扣一次库存。两道菜各需 2 个番茄、库存 1 个，结果为 3 个；不能简单合并两份单菜缺口。
- 每日灵感独立于库存，进入详情才判断采购需求；不需要 AI 或外部在线推荐服务。
- 热量增加份数、来源与估算标识，未知值显示不可用。600 kcal、3 份显示每份 200 kcal。
- 已购状态可撤销并持久保存，不自动增加库存；迁移后旧库存与清单不得丢失。

容量不足按 Task 3 延后较低优先级增强项并记录未完成目标，临期提醒最后考虑；不降低 V1 的正确性和持久化门槛。

## 12. 风险与实施顺序

| 风险 | 负责人 | 处理 |
| --- | --- | --- |
| T4-01 未完成导致主流程不可用 | Peng Ke 实现，ChangPeng Shi 断言，HaoZhe Feng 集成 | 第一批完成并评审；页面可先用固定快照开发，但不能以假计算验收 |
| V0 扩成完整后台，挤占正式迭代 | ZheKai Mao | 守住第 3 节边界；先完成两道菜完整流程 |
| 页面间库存与清单不同步 | HaoZhe Feng、ChangPeng Shi | 单一快照与统一写入口；每次库存变更重算相关结果 |
| 单位不一致或小数错误 | ChangPeng Shi | 规范 ID、校验封装、明确不可比较状态及精度用例 |
| 拉取、依赖或团队机器差异 | HaoZhe Feng | 正式 clone、锁文件、固定 Node；第二成员提前验证环境 |
| 招募不足或工时不足 | ZheKai Mao | 准备日 A 开始招募；实际报告样本；先保核心操作与验收 |
| 演示被误当作保存可靠的产品 | Peng Ke | 持续展示演示状态；V1 单独验证持久化与真实失败 |

实际开工顺序为：**正式 clone 与合同确认 → T4-01 和前端骨架 → 库存、菜谱及统一状态 → 单菜清单 → 错误与小屏 → 交叉评审、复现和试用 → V1 Day 1 评估**。达到 V0 交接条件后再进入正式十工作日计划。
