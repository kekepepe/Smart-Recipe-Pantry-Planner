# V1 本地运行与恢复手册

V1 开发版位于 `feat/v1-core`，使用 React/Vite + Express + SQLite。库存与单菜购物清单保存到本机文件；刷新和服务重启保留数据。当前仅支持本机受控单空间使用，尚未交付多人认证或公网托管。

## 安装与运行

使用 `.nvmrc` 指定的 Node 22.23.1 和 npm。首次使用：

```bash
git clone --branch feat/v1-core https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
npm ci
npm run db:init
npm run dev
```

打开 http://127.0.0.1:5173/ 。`dev` 同时启动前端 5173 和 API 3001，按 Ctrl+C 停止两者。API 只允许 loopback；前端代理 `/api`，不直接打开数据库。

如需只用构建后的同源服务：

```bash
npm run build
npm start
```

打开 http://127.0.0.1:3001/ 。普通启动不会创建丢失的数据库或自动改 schema。端口冲突会失败；缺库时先核对 DB_PATH，再显式执行初始化，不要在错误路径上随意新建库。

`.env.example` 给出配置，可自行复制为 `.env`；不复制也有默认值：HOST=127.0.0.1、PORT=3001、DB_PATH=var/dev.sqlite。相对 DB_PATH 以应用根目录解析，绝对路径也可用。`.env`、数据库和备份不提交。改 PORT 时 `dev` 的 Vite 代理自动读取该值。

**`npm run preview` 仍只是 Vite 静态预览，不提供数据库/API，不作为 V1 运行入口。** V0 的 `simulateSaveFailure` 和 Reset demo 不再属于 V1 产品流程。

## 首次使用与演示

- 新空间可选两蛋一番茄或从空库存开始，也可先浏览 20 道菜谱。
- 使用样例后，原鸡蛋菜可做，原番茄菜缺 1；生成清单两次仍缺 1。库存番茄改为 2，清单无需采购。
- 返回首页、刷新、重启后继续已有库存，不会重设样例。普通首次库存写入也会锁定初始化状态，防止样例覆盖。
- 库存使用规范目录（当前 50 种），保存设置总量；piece 为整件，g/ml 最多两位小数。水不参与库存。熟米饭和生米为两个 ID，不自动换算；不同单位明确要求核对。
- 每次只选择一道菜，选择另一道会替换清单；操作不扣库存。库存修改与清单重算在一个数据库事务中提交。
- 菜谱支持英文/中文名称搜索、分类及可做性筛选；详情查看全部用量、份数、来源和调整说明。

## 保存与错误恢复

页面成功提示只在收到数据库提交成功的响应后出现。输入错误保留草稿；冲突会载入最新数据并保留表单，核对后再保存。“Reload saved data”只重新读取，不清空库存。

断连或超时可能发生在提交之后。此时页面提示结果未确认，尝试读取已保存数据；不能读到时保留原页面和草稿。恢复服务后先点击 Reload saved data，核对总量与单位，再决定重试。页面重新获得焦点或网络恢复也会重新同步。当前不提供跨设备实时同步。

`/api/health` 验证服务及数据库可读；写入失败还需查看实际写请求结果。日志包含请求编号及错误码，客户端不返回 SQL、堆栈或磁盘路径。

## 迁移与目录维护

```bash
npm run db:migrate
npm run db:seed
```

迁移和相同版本 seed 可重复执行，不清空用户库存。迁移文件有校验和，未知版本或改写已应用 SQL 会停止处理。当前交付初始 schema 001；尚无前一版持久化 schema，不能声称已经验证不存在的 V0 磁盘迁移。

目录变更后，先备份，再显式运行：

```bash
npm run db:seed -- --upgrade
```

目录版本升级在事务中写入，并重算已选清单、递增 workspace revision。删除已有菜谱需要专门迁移，不能靠 seed 隐式移除被引用记录。不要直接手改生产 SQL 表。

若程序检测清单缓存与库存/目录版本或实际数量不一致，会拒绝显示旧清单。检查数据来源与备份后可执行受控修复：

```bash
npm run db:repair
```

该命令只从当前库存和菜谱重建清单，递增版本，不清空库存；它不是从损坏库存恢复数据的办法。

## 备份与恢复

下面命令跨平台；自行使用从未存在的新文件名：

```bash
npm run db:backup -- backups/before-release-001.sqlite
npm run db:restore -- backups/before-release-001.sqlite var/restored-001.sqlite
```

备份调用 SQLite 一致性 backup API，可对正在使用的库读取一致快照，不直接复制活动主文件。旁边的 `.json` 保存 SHA-256、时间、schema 与可取得的应用提交标识。保留数据库和 `.json` 两个文件；同名备份拒绝覆盖。发布/迁移前备份，至少保留两份可恢复副本。

恢复时停止服务、保留原故障库，恢复到新路径；工具核验校验和、schema、SQLite 完整性和业务快照。随后将 `.env` 中 DB_PATH 改为新路径，用匹配版本 `npm start`，核对库存、所选菜、采购量。工具拒绝覆盖已有目标；不会自动改 `.env`，也不会删除原库。

如迁移后需回退，使用备份记录对应的旧应用和旧库副本；不对当前数据盲目运行降级 SQL。共享试运行还需独立存储备份与维护负责人，当前本地备份不代表这些条件已具备。

## 检查命令

```bash
npx playwright install chromium
npm run check:v1
```

依次执行原有 21 项规则/状态测试、demo 5 项断言、HTTP 测试、数据库集成测试、build 和 Chromium 端到端检查。测试用例使用临时文件数据库，不重用开发库存。单独入口：`test:api`、`test:integration`、`test:e2e`。浏览器用例运行构建后的同源 Express 服务，截图在忽略提交的 `test-results/`。

CI 在 Linux/Mac/Windows 上运行安装、规则、API、数据库和构建；Linux 另跑浏览器并上传截图/失败跟踪。实际平台结果以该提交的 Actions 为准，不以配置存在推断通过。

## 交接边界

当前开发由 Codex 在 Peng 工作区协助完成，不记为其他成员完成了其任务。第二成员独立复现、真实用户试用、同行评审和 main 发布仍由实际执行者留证。见 [技术验收](V1-ACCEPTANCE.md)、[反馈记录](V1-FEEDBACK.md)、[发布状态](V1-RELEASE.md)。
