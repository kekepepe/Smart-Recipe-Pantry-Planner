# V0 CI 与 Windows 集成复核

日期：2026-11-06（Asia/Hong_Kong）。账号：HaoZhe Feng / `fhhhz-todd`；由 Codex 在该成员 Windows 环境协助执行，不代表人工浏览器验收或其他成员贡献。

关联：[需求 #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)、[CI PR #2](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/2)、[V0 PR #3](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/3)。

## 复核结论与修改

- V0 已合入 main `f75ba58a6713ae0f020ae2bf4f0db7bb8f5c30c9`，新增 React/Vite、锁文件、真实断言与构建步骤。旧 Task 4 的“无需安装依赖”和失败预期不再适用于当前 V0。
- 将 main 合入 `task4/ci`，解决双方新增 `.github/workflows/test.yml` 的冲突；保留 V0 的 `.nvmrc`、npm 缓存、`npm ci`、最终检查和构建，追加 `npm run demo`。
- CI 保持只读 contents 权限，在 PR 和 main push 上执行，不跳过测试或忽略失败。
- 本机系统 Node 24 不符合新 engines 范围；使用官方 Windows x64 Node 22.23.1 便携包，并核对官方 SHA-256 清单。仅为检查进程设置 PATH，未替换系统 Node。

## 实际验证

环境：Windows x64，Node.js 22.23.1，npm 10.9.8；在上述 main 基线合入 CI 分支后的工作树运行。

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm ci` | 成功，新增 19 个包，审计报告 0 vulnerabilities |
| `npm run test:final` | 16 pass，0 fail，0 skipped，0 todo |
| `npm run demo` | 需要番茄 2、库存 1，Actual 缺口 1，与 Expected 一致 |
| `npm run build` | 成功，生成 dist；JS 245.54 kB，CSS 11.84 kB |
| `git diff --check` | 通过 |

检查了现有测试对缺口计算、输入不变性、单位不兼容、小数计算、清单去重、库存更新、重置及模拟保存失败恢复的覆盖。现有测试运行结果不等于浏览器界面验收。

已确认 V0 main 基线的远端 [Actions 成功记录](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42174104141)。它对应 `f75ba58`，不包含本 PR 新增的 demo 检查；本 PR 的新检查应查看 PR Checks。

## 待团队完成

- Peng（`kekepepe`）评审本次更新；PR #2 合并后记录新 main 的成功 Actions。
- 本次复用已有 clone，不算“第二成员干净克隆复现”；该项仍待执行和记录。
- 仅确认 `fhhhz-todd` 已能推送自己的分支；其他成员权限需分别核实。
- 浏览器流程、真实用户试用、四人贡献与最终 evidence.md 由团队继续验收。此次不修改 Peng 的业务实现，也不将其实现或测试归为 HaoZhe 的贡献。
