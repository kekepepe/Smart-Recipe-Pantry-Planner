# V0 本地运行与交接手册

V0 是可交互的本地原型，使用 React、Vite、JavaScript 和内存数据。刷新会清空演示状态并返回入口。V1 才加入服务端、数据库和重启恢复。

## 开发位置

Peng 的开发 clone：`/Users/kepeng/Desktop/AUTclass/software/workspace/Smart-Recipe-Pantry-Planner`；其他成员使用各自的项目目录。
V0 已通过 [PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3) 合入 main，集成提交为 `f75ba58`。原开发分支为 `feat/v0-prototype`，实现基于 `6b44fc4`。

上层 `software/` 是课程资料目录，不执行 git 提交。仓库中的 [实施计划](V0-IMPLEMENTATION-PLAN.zh-CN.md) 保留实施前的规划；当前实现与限制以本手册和 [技术验收](V0-ACCEPTANCE.md) 为准。

## 安装与启动

使用 `.nvmrc` 中的 Node.js 22.23.1（Node 22，最低 22.12）。安装 nvm 的成员可运行 `nvm install && nvm use`；其他成员手动安装相同版本。

```bash
cd /Users/kepeng/Desktop/AUTclass/software/workspace/Smart-Recipe-Pantry-Planner
npm ci
npm run dev
```

Windows PowerShell：先进入自己的 clone，确认 `node --version` 为 `.nvmrc` 指定的版本，再运行 `npm ci` 和 `npm run dev`。当前 `package.json` 要求 Node `>=22.12.0 <23`，Node 24 不符合本项目的版本范围。

冯灏哲本机已单独安装 Node 22.23.1，保留系统 Node 24。每次新开 PowerShell 可执行：

```powershell
cd "$HOME\Desktop\Smart-Recipe-Pantry-Planner"
$runtimePath = Join-Path $env:LOCALAPPDATA 'CodexRuntimes/node-v22.23.1-win-x64'
$env:PATH = "$runtimePath;$env:PATH"
node --version
npm.cmd ci
npm.cmd run dev
```

该便携运行时路径仅适用于已安装它的本机；其他成员应自行安装 `.nvmrc` 指定的 Node 版本。Windows 复验结果见 [CI 集成复核](task4/ci-v0-review.md)。

打开 [本地开发页](http://127.0.0.1:5173/)。服务仅监听本机；5173 已被占用会报错，不会悄悄换端口。终端按 Ctrl+C 关闭。

```bash
npm run test:final
npm run demo
npm run build
npm run preview
```

构建文件在忽略提交的 `dist/`；本地静态预览为 [4173 端口](http://127.0.0.1:4173/)。`preview` 需要先执行 build，也只监听本机。不要直接双击 index.html；它需要 Vite 开发服务或构建后的 HTTP 服务。

## 两蛋一番茄演示

1. 首页选择 **Use sample pantry**，列表显示鸡蛋 2 个、番茄 1 个。
2. **Simple scrambled eggs** 标为可做；**Warm tomato skillet** 标为缺番茄 1 个。
3. 打开番茄菜谱详情，对比 Need 2 / Have 1 / Missing 1，选择 **Add missing ingredients to list**。
4. 购物页显示番茄 1 piece；返回详情再次添加，仍为 1。
5. 在 **My pantry** 编辑番茄为 2 piece，购物页同步显示 **Nothing to buy**，菜谱同步成为可做。
6. 将番茄改为 100 g，列表与已选清单提示 **Check units**，不会把克和个混算。
7. **Reset demo** 需确认，恢复两蛋一番茄、清除清单和筛选；首页的 **Add my own ingredients** 从空库存开始。

数量必须为 0–1,000,000 的有限数值；piece 为整数，g/ml 最多两位小数。同一食材保存设置总量，不累加。V0 一次选择一道菜，生成另一道菜的清单会替换旧选择，操作从不扣减库存。

原型提供鸡蛋、番茄、米、牛奶、菠菜五个规范食材，两道简化菜谱。其余食材用于验证库存输入，不意味着已有对应菜谱。菜谱说明是本原型新编写的简化演示内容；图片为内置 Image Gen 生成的示意图，不构成营养数据或实测成果。

## 错误恢复检查

仅开发模式支持以下故障入口：

- 新打开 `http://127.0.0.1:5173/?simulateSaveFailure=1`，选择自己添加或示例；下一次库存保存、删除或生成清单会失败一次，随后重试恢复。
- 或在开发工具 Console 输入 `window.__pantryDemo.failNextSave()`，再执行一次写操作。

预期：显示错误，保留输入、库存和选择，不出现已保存提示；重试成功后刷新共享快照。该模拟只验证 UI 行为，不证明数据库故障处理。生产构建不包含开发入口的初始化逻辑。刷新带 query 的开发 URL 会重新注入一次失败；正常演示使用不带 query 的地址。

## 代码位置

- `src/calculate-shortages.js`：保留 T4-01 输入输出合同的纯计算函数。
- `src/evaluate-recipe.js`：规范 ID、数量、单位校验和小数精度；不兼容单位单独标记。
- `web/services/mock-client.js`：会话内数据、异步接口、实时清单与重置。
- `web/AppProvider.jsx`：统一快照、写操作互斥、反馈与确认对话框。
- `web/pages/`：首页、库存、菜谱列表、详情、购物页。
- `tests/`：16 项真实规则和状态测试。
- `.github/workflows/test.yml`：PR 或 main push 后执行安装、最终检查、演示和构建。V0 原始集成提交 `f75ba58` 的 [main Actions 已成功](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42174104141)；新增演示检查的结果以 PR #2 为准。

## 交接边界

本次由 Codex 协助实现代码和检查，不能代替四位成员各自完成课程贡献。Task 4 已有 Issue #1 和上述 main Actions；四人自己的 PR/评审、第二成员干净克隆、真实验收与复盘仍需逐项核实并记录。不要用本地测试结果替代这些证据。

本次未招募真实用户，也未冒充第二成员复现。技术验收通过只表示可以开始团队评审与试用，不代表 V0 已通过所有项目交接门槛。

V1 接入 Express + SQLite 并由服务端处理计算和校验；按 Task 3 Day 1 重新确认技术栈。V0 无账户、持久化、多用户权限、热量、多菜合并、已购勾选或公网部署。
