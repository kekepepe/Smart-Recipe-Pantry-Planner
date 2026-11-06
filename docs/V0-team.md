# V0 原型：四人分工 / Four-person prototype team

[中文 PRD](PRD.zh-CN.md) · [English PRD](PRD.md)

**共同交付 / Shared outcome:** 一套可在本地重置、从库存走到购物清单的交互原型，一次用户测试记录，以及交给 V1 的改进清单。 / Deliver one resettable local prototype, a usability test record and a prioritised handoff to V1. Names and responsibilities follow Task 3 Final.

| 成员 / Owner | 工作与交付 / Deliverable | 交接与完成标准 / Handoff and acceptance |
| --- | --- | --- |
| ZheKai Mao · 产品与体验 / UX and evaluation | 画出核心路径与页面文案，设计不提示操作步骤的测试任务。主导试用，记录任务成功、卡点和改动理由。 / Map the journey, write screen copy and neutral test prompts, facilitate sessions and record findings. | 开工前给 Peng Ke、ChangPeng Shi 页面状态表；结束时用 PRD 场景复测，按严重程度向全组移交 V1 待办。 / Give Peng Ke and ChangPeng Shi the screen-state matrix before implementation; retest the PRD scenario and hand over ranked findings. |
| Peng Ke · 库存与界面 / Pantry and navigation | 实现首页、库存录入与编辑、空状态和错误提示，负责页面导航、小屏布局和键盘操作。 / Build entry and pantry screens, validation, navigation, narrow-screen layout and keyboard support. | 和 ChangPeng Shi 约定数量、单位和标识；修改一个番茄为两个后，返回列表能看到更新的匹配结果。 / Agree on IDs, quantities and units with ChangPeng Shi; changing one tomato to two updates recipe availability on return. |
| ChangPeng Shi · 菜谱与清单 / Recipes and shopping | 准备两道可解释的样例菜谱，实现菜谱分组、详情、缺口计算和购物清单。 / Supply two explainable recipe fixtures and implement grouping, details, shortages and the list. | 向 Peng Ke 提供统一样例与结果格式，向 HaoZhe Feng 提供预期结果。重复添加同一道菜谱只出现一个缺口；单位不可比较时提示核对。 / Share fixtures and result format with Peng Ke, expected outputs with HaoZhe Feng. Repeated adds do not double the shortage; incomparable units prompt review. |
| HaoZhe Feng · 集成与运行 / Integration and operations | 建立本地启动、示例重置与冒烟检查，整合 Peng Ke/ChangPeng Shi 页面，编写演示手册。为 V1 记录数据实体、持久化需求及 Mac mini／云试运行的前置条件。 / Own local setup, reset, smoke checks, integration and demo guide; document storage needs and pilot prerequisites for V1. | 请另一名成员从干净环境复现；重置后回到“两蛋一番茄”。向 ZheKai Mao 交付可测试版本，向 V1 交付运行手册草案和未决事项。 / Have another member reproduce setup and reset to two eggs and one tomato. Give ZheKai Mao a testable build and V1 a draft runbook and open decisions. |

**协作顺序 / Sequence**

1. **对齐 / Agree:** ZheKai Mao 说明任务，Peng Ke/ChangPeng Shi 共同确定页面状态与样例数据，HaoZhe Feng 记录启动方式。 / ZheKai Mao walks through the task; Peng Ke and ChangPeng Shi agree on states and fixtures; HaoZhe Feng records setup.
2. **集成 / Integrate:** Peng Ke、ChangPeng Shi 各完成一条可演示路径，HaoZhe Feng 整合后让 ZheKai Mao 从头走一次。 / Peng Ke and ChangPeng Shi deliver their paths; HaoZhe Feng integrates them and ZheKai Mao tries the whole journey.
3. **验证 / Evaluate:** ZheKai Mao 主持、HaoZhe Feng 记录环境和缺陷，Peng Ke/ChangPeng Shi 修复并交叉复核，ZheKai Mao 复测。 / ZheKai Mao facilitates; HaoZhe Feng records environment and defects; Peng Ke and ChangPeng Shi fix and cross-review; ZheKai Mao retests.
4. **交接 / Hand off:** 全组根据 PRD 门槛决定进入 V1 或继续修改 V0；记录测试人数、未解决问题、下一步负责人。V0 的模拟存储不能作为 V1 持久化验收证据。 / Use the PRD gate to advance or revise. Record tester count, unresolved issues and owners. Mock storage does not establish V1 persistence.


**与 Task 3 的衔接 / Task 3 handoff**

V0 在两个迭代之前准备；迭代 1 为第 1–5 个工作日，迭代 2 为第 6–10 个工作日。第 1 天检查 V0 后确认复用代码和技术栈。初始目标为受控本地演示。 / Prepare V0 before the two iterations: V1 on working days 1–5, V2 on days 6–10. Inspect V0 on Day 1 before confirming reusable code and stack. Start with a supervised local demo.

- **ZheKai Mao:** 管理共享需求清单、优先级和迭代评审，评审发布证据。 / Own backlog, priorities, iteration reviews and release-evidence review.
- **Peng Ke:** 在 V2 负责每日灵感和反馈改进的界面实现。 / Own daily inspiration and implementation of usability improvements in V2.
- **ChangPeng Shi:** 在 V2 负责合并清单和热量估算。 / Own combined shopping and calorie estimates in V2.
- **HaoZhe Feng:** 从 V1 起负责服务／数据库集成、迁移、自动检查、持久化验证、每日合并、打包和恢复手册。 / From V1 own service/database integration, migrations, automated checks, persistence verification, daily merges, packaging and recovery notes.

Peng Ke 和 ChangPeng Shi 交叉评审；HaoZhe Feng 支援两人的集成，Peng Ke 替补试用主持。每项完成均需验收通过、评审合并、错误状态可用及说明更新；另一成员复现启动。核心数据丢失、错误可做判断或错误采购总量阻断发布。 / Peng Ke and ChangPeng Shi cross-review. HaoZhe Feng backs up their integration; Peng Ke backs up trial facilitation. Done requires passing acceptance, reviewed/merged code, working errors and updated notes; another member reproduces setup. Data loss, false-ready matches and incorrect shopping totals block release.

Source: [Task 3 Final](../Smart_Recipe_and_Pantry_Planner_Task3_Project_Plan_Final.docx).
