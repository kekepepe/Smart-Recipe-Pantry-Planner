# 第一轮质量场景：组合查询响应时间

关联：[#16](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/16)、[#9](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/9)、[#13](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/13)。执行者：HaoZhe Feng / `fhhhz-todd`，Codex 协助编写脚本、执行测量及整理记录。日期：2026-11-23（Asia/Hong_Kong）。

## 被测版本与结果

固定应用 SHA：`14e64b361ac95dc1772b9b25a34cffae49d140cd`（V2 首批合入 main）。测量脚本及本文属于后续测量 PR，不把该 PR 的提交当作被测软件 SHA。应用代码未修改。

600 次正式请求全部返回预期的 HTTP 200、目录版本、结果数量和页码；五条件查询还验证了准确的菜谱 ID。组合查询中位数为 **14.912 ms**，p95 为 **17.549 ms**。以下是本机单用户热缓存基线，不构成公网性能承诺或已通过性能 SLA 的结论；项目尚未约定数值门槛。

| 场景 | 样本数 | 正确响应 | 最小 ms | 中位数 ms | p95 ms | 最大 ms | 均值 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 默认列表第 1 页 | 150 | 150/150 | 7.084 | 15.398 | 22.505 | 24.493 | 15.479 |
| 国家+地区+口味+餐次+关键词 | 150 | 150/150 | 6.382 | 14.912 | 17.549 | 26.992 | 14.610 |
| 合法空结果（苦味） | 150 | 150/150 | 6.616 | 15.202 | 21.703 | 24.575 | 15.139 |
| 默认列表第 5 页 | 150 | 150/150 | 7.740 | 15.873 | 20.903 | 29.505 | 15.658 |

各次运行的 p95（每格 50 样本），避免仅汇总掩盖波动：

| 运行 | 第 1 页 ms | 五条件 ms | 空结果 ms | 第 5 页 ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 18.038 | 20.808 | 23.078 | 18.789 |
| 2 | 21.015 | 16.658 | 21.046 | 20.306 |
| 3 | 22.776 | 17.549 | 22.539 | 23.345 |

## 固定口径

- 环境：Windows x64，内核版本 `10.0.26200`，Intel Core i9-14900HX，32 逻辑处理器，物理内存 `68319440896` bytes；Node `v22.23.1`，npm `10.9.8`。安装命令 `npm ci` 成功。
- 数据：固定提交中的 100 菜目录、schema 003；每次运行创建独立临时 SQLite，执行 migrate/seed，库存两蛋一番茄，依次选择 `tomato-skillet`、`tomato-eggs`。不读取或更改个人开发数据库。
- 三次独立服务进程/数据库。每次每场景预热 10 次、正式测 50 次：共 120 次预热、600 次正式请求。每轮确定性轮换场景顺序；并发数 1，无重试。没有挑选或丢弃正式样本。
- 请求发往实际 Express `/api/recipes`，HTTP loopback，Node fetch 默认连接池。`performance.now()` 从调用 fetch 前计至完整正文读取完毕；包含客户端、HTTP、数据库快照及业务处理开销，排除 JSON 解析/断言。不是纯 SQL 耗时。
- 服务启动、初始化、健康探测与预热不计入结果。每个正式响应仍在计时后校验；异常样本保留并使脚本失败。
- p95 使用 nearest-rank：排序后第 `ceil(0.95*n)` 项；中位数为中间两项均值。汇总 p95 由同场景 150 个原始值计算，不是三次 p95 的平均。表格四舍五入至三位小数，JSON 保留原始精度。

| 场景 | 原始 query | 独立预期 |
| --- | --- | --- |
| 第 1 页 | `page=1&pageSize=20` | total=100，20 条，第 1 页 |
| 五条件 | `countries=cn&regions=sichuan&tastes=spicy&meals=dinner&q=宫保` | total=1，唯一 ID `gong-bao-chicken` |
| 空结果 | `tastes=bitter` | total=0，0 条，第 1 页 |
| 第 5 页 | `page=5&pageSize=20` | total=100，20 条，第 5 页 |

## 命令与证据

脚本：[measure-query-latency.mjs](../../scripts/measure-query-latency.mjs)。原始结果：[iteration1-query-latency.raw.json](iteration1-query-latency.raw.json)，包含 600 个独立样本、运行级汇总、时间、环境、应用 SHA、lockfile/脚本 SHA-256 和 catalogVersion。

目录版本：`c7f4fa453136c1227fa502c633c0a422be0007284bdfa1bcf72631a9a3955dc2`。

本次实际执行（在测量分支目录，PowerShell）：

```powershell
$runtimePath = Join-Path $env:LOCALAPPDATA 'CodexRuntimes/node-v22.23.1-win-x64'
$env:PATH = "$runtimePath;$env:PATH"
# 此前已在独立、固定 SHA 的 baseline worktree 中执行 npm.cmd ci。
node scripts/measure-query-latency.mjs ../Smart-Recipe-Pantry-Planner-quality-baseline docs/quality/iteration1-query-latency.raw.json
```

其他成员复现时安装 `.nvmrc` 的 Node 版本，在测量 PR 的 checkout 目录执行以下命令。`../pantry-quality-baseline` 必须是尚不存在的新路径；输出文件也必须新建，脚本拒绝覆盖证据。

```powershell
git worktree add --detach ../pantry-quality-baseline 14e64b361ac95dc1772b9b25a34cffae49d140cd
Push-Location ../pantry-quality-baseline
npm.cmd ci
Pop-Location
node scripts/measure-query-latency.mjs ../pantry-quality-baseline ../iteration1-query-latency-rerun.json
```

macOS/Linux 使用相同 Node 版本，将 `npm.cmd` 改为 `npm`，用 shell 的 `cd` 进入/返回目录即可。脚本不依赖测量分支的 node_modules；应用依赖从目标 checkout 加载。临时测试数据库及服务日志保留在系统临时目录的 `pantry-quality-*` 中，服务在运行后关闭；不将数据库或本机绝对路径提交到仓库。

## 限制与第二轮比较

- 只有一台电脑、三个短运行，桌面其他进程/电源及温度未受实验室控制；没有置信区间、长期稳定性或并发容量结论。
- 仅热缓存、本机 API 往返；不包含冷启动、浏览器布局/渲染、真实移动设备、跨网延迟和多人负载。响应时间不能替代 Mao 的独立复现或真实用户试用结果。
- 本轮没有发现这四个场景的错误响应，也没有因无门槛而把慢响应虚构成性能缺陷；不据此声称没有其他缺陷。
- 第二轮应保留同一脚本、Node/硬件环境、目录/库存/选择、查询、预热次数、采样数和统计定义，仅切换到明确登记的新应用 SHA；若目录或运行环境变更，必须单列差异，不直接宣称改进百分比。
- ChangPeng 审批测量 PR，Mao 复核口径；审批后由 Hao 本人合并。审批、合并和第一轮证据汇总尚待团队完成。
