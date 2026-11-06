# V0 界面系统与设计对照

## 参考与实现范围

内置 Image Gen 生成 [桌面菜谱与手机库存概念图](v0-concept.png)，作为本次实现参考。当前任务要求直接搭建，未单独设置设计审批阶段。首页、详情、清单和确认框沿用同一系统，属于 PRD 核心流程所需页面。

设计方向是白底、深绿、少量浅灰绿表面、衬线标题和无衬线操作文本的厨房笔记工具。应用名称保留 Smart Recipe and Pantry Planner，界面简称 Pantry & Plate。

## 设计 token

| 项目 | 值 |
| --- | --- |
| 页面背景 | #ffffff |
| 主色 | #245a42 |
| 标题色 | #163f2c |
| 正文色 | #202922 |
| 次要文字 | #647065 |
| 浅表面 | #f4f6f2；示例条 #eff3ec |
| 边线 | #dce2db |
| 缺口/单位状态 | #865721，配合文字而非仅颜色 |
| 标题字体 | Georgia、Times New Roman、serif |
| 正文/控件 | Arial、Helvetica、sans-serif |
| 标题层级 | 桌面 H1 46px、菜谱 H2 27px；手机 H1 35px |
| 控件 | 15px；主按钮最小 46px，手机菜谱按钮最小 42px |
| 布局 | 最大宽 1120px；菜谱使用横向行；760px 与 420px 断点 |
| 圆角 | 控件 6–7px、行和图片 8–12px |

小图标为 currentColor SVG；品牌是简洁双叶标记，箭头、返回、对勾、购物袋采用统一线宽。没有外部字体或图标 CDN。避免营销 hero 标签、虚构统计与未实现功能导航。

## 文字与交互基线

首屏保留：Pantry & Plate；My pantry / Find recipes / Shopping list；Reset demo；Demo mode · Changes reset on refresh；What can you make?；A little less guesswork. A little more cooking.；Edit pantry；Your pantry；All recipes / Can make now / Need ingredients；两个样例菜谱名称；View recipe。

使用一个统一快照串联库存、匹配和单菜清单。新增或更新不会在每个页面形成不同副本。确认框用原生 HTML dialog 的模态行为约束焦点，默认聚焦 Cancel；页面切换将焦点移至 H1。尊重 reduced-motion。

## 对照检查与有意调整

2026-11-06 使用 IAB 在 1440×1000 和 375×812 视口截图，并通过 view_image 对照概念图和最终桌面/手机截图。概念图为桌面与手机并排的 1487×1058 参考板，两个画面不是一个浏览器视口；实现分别验证对应桌面和手机页面。

| 对照点 | 概念与实现证据 | 处理 |
| --- | --- | --- |
| 布局 | 顶部品牌/导航，提示条，标题、库存条、筛选、两个菜谱横行 | 保留；参考板外边框只表示画面边界，不作为产品装饰框 |
| 排版 | 衬线深绿标题、无衬线控件、明显正文层级 | 已按 token 实现；大视口使用 1120px 居中内容 |
| 调色与表面 | 真白背景、深绿按钮、浅灰绿菜谱行 | 已保留；按钮使用纯色，不复刻图中不必要的轻微渐变 |
| 文字 | 核心导航、标题、筛选、两菜谱名与动作 | 保留；描述改用固定数据中的文案；无虚构指标或新增功能导航 |
| 配料正确性 | 概念生成图额外列了油、蒜等必需配料 | 按 PRD 修正：必需配料仅 2 eggs 或 2 tomatoes；调味明确为可选，避免错误可做判断 |
| 图片 | 两道菜的自然食物摄影 | 分别生成无额外可见配料的独立图，替换概念中的装饰性香草与配菜 |
| 状态 | 概念用绿色表达可做与缺口 | 缺口改为可读的琥珀色且保留文字，避免把缺料误当作可做 |
| 手机 | 堆叠导航、库存行、数量/单位表单 | 375px 下重排，无横向溢出；补充小型 Reset demo 和反馈文字以满足功能 |
| 反馈与对话框 | 概念未画全部错误、重置和删除状态 | 按 PRD 补充文字反馈、确认和错误保留草稿，沿用同一色彩/控件系统 |

首屏文字核对：导航、主标题、副标题、主动作一致；菜谱描述、配料、缺口颜色和界面简称属于上表已记录调整。无未记录的营销文案或功能扩展。没有发现尚未修复的遮挡、缺图或横向溢出。

## README 界面截图

`docs/screenshots/v0-desktop-recipes.png`、`v0-mobile-pantry.png`、`v0-mobile-shopping.png` 是 IAB 中实际运行原型的截图，已加入中英文 README。它们与下列 Image Gen 设计图、食物素材不同，不用于证明真实用户试用。

## 素材与生成方式

生成方式：内置 Image Gen；没有使用 CLI/API fallback。所有项目引用素材已复制到仓库，运行不依赖 Codex 缓存路径。

| 文件 | 用途 |
| --- | --- |
| `docs/design/v0-concept.png` | 桌面菜谱页与手机库存参考板 |
| `public/images/eggs.png` | 首页与鸡蛋菜谱的示意图 |
| `public/images/tomatoes.png` | 番茄菜谱示意图 |
| `public/favicon.svg` | 代码原生的简洁双叶标记 |

最终 prompt 要点与限制记录如下，供后续延续设计。完整实际使用的主要措辞保持英文，避免翻译引入额外含义。

### 概念图 prompt

Use case ui-mockup. One high fidelity product design reference board, desktop Recipes and mobile Pantry. Smart Recipe & Pantry Planner for students/home cooks. Functional tool, no marketing hero. White #ffffff, forest green #245a42, pale gray #f6f7f4, charcoal text. Quiet kitchen notebook aesthetic, readable sans typography and Georgia-style heading. Pantry & Plate brand, My pantry / Find recipes / Shopping list navigation, Reset demo, Demo mode · Changes reset on refresh. What can you make? A little less guesswork. A little more cooking. Your pantry: 2 eggs · 1 tomato. Filters All recipes / Can make now / Need ingredients. Two generous recipe rows: Simple scrambled eggs (2 eggs, 8 min, Can make now) and Warm tomato skillet (2 tomatoes, 12 min, Need 1 tomato), View recipe actions. Mobile has pantry rows, Edit / Remove, Ingredient / Quantity / Unit fields and Add ingredient. All text and controls code-native, complete screens, no invented metrics, calories, recommendations, unrelated nav, decorative heading pills, browser chrome or watermark.

### 鸡蛋图 prompt

Editorial food photograph, landscape 4:3, close view of soft golden scrambled eggs on a neutral handmade ceramic plate, no herbs no extra ingredients, simple pale linen and white background, natural daylight, genuine cooked egg texture, quiet contemporary kitchen style, no text no marks. For a small recipe thumbnail in a white and forest-green student pantry app. Center food with ample breathing room. Not a UI mockup.

### 番茄图 prompt

Editorial food photograph, landscape 4:3, tender red tomato wedges gently cooked in a small dark skillet, no visible extra ingredients no garnish, simple pale linen and white background, soft natural daylight, realistic food texture, quiet contemporary kitchen style, no text no marks. For a small recipe thumbnail in a white and forest-green student pantry app. Center skillet with ample breathing room. Not a UI mockup.

图片仅用于演示，不能当作实际食物、营养数值或用户测试证据。仓库整体发布许可仍需团队另行决定。
