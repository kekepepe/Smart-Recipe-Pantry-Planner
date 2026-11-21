# V2 首批：分类、100 菜目录与多维检索

日期：2026-11-07。状态：本地实现与验收完成，尚未提交/推送；完整 V2 尚未完成。工作基于 `feat/v1-core` 的 V1 基线 `ed31b62b5dc4d05f416372ff61d52ee7aa27a838`，不是已经发布的新提交。

## 已实现

- 规范原料 286 种：174 种食材、112 种调料；数据库 `ingredients.kind` 与菜谱 `recipe_requirements.role` 分开保存，菜谱可以覆盖默认角色。库存表单按食材/调料分组，详情逐行标记角色。调料仍参与完整可做性与采购计算，没有默认拥有或自动入库。
- 100 道不同标题/ID 的带图菜谱：保留原 20 道配方用量，新增 80 道。16 个国家分类、15 个地区分类，口味为酸/甜/苦/辣/咸/鲜，餐次为早/中/晚餐。无可靠地域标签的两道原始演示配方不伪造归属。
- Find recipes 可用任一条件或同时组合国家、地区、口味、餐次、关键词、原分类与完整可做性。同一维度 OR、不同维度 AND；无结果不放宽，非法标签和矛盾国家/地区返回错误。苦味当前无菜，允许查询并明确返回零结果。
- 关键词覆盖中英文菜名及原料名称（已提供中文名的原料亦可中文搜）。筛选保存在 URL query 中，详情返回/刷新保留。默认每页 20 道，稳定顺序、总数、前后翻页；修改条件回第一页；过大页码规范到最后有效页。
- `GET /api/recipes` 提供同一检索规则，响应含 total/page/pages/pageSize/appliedFilters/taxonomy/catalogVersion/pantryRevision。查询不写库；快照与列表使用同一份服务端目录，浏览器复用纯筛选模块，避免两套 OR/AND 语义。

例：`/api/recipes?countries=cn&regions=sichuan&tastes=spicy&meals=dinner&q=宫保` 返回宫保鸡丁；只传 `meals=breakfast` 同样有效。参数值见 `src/discover-recipes.js` 的字典。

## 来源、配方和图片

原 18 道 HowToCook 改编与两道 V0 演示保留。新增 80 道改编自 [UniTools 开放数据](https://github.com/farcrak/unitools-recipes/tree/2f554073f7e730b18d707fe1164d18308f6ec16c)，归属 UniTools — theunitools.com，采用 CC BY-SA 4.0；改编数据 `data/world-recipes.json` 继续适用该许可，不将其误标为软件代码许可。

保存了所选原文快照、固定提交、LICENSE、上游 README 和逐菜改编记录：`data/sources/unitools/`。汤匙、小勺、适量、分数个等无法直接用于现有库存规则的用量改为明确的编辑准备份量，逐菜记录；不把这些指定份量当作通用密度换算。熟米饭/生米、蛋黄/全蛋、肉类部位、红/白葡萄酒等分别识别。未导入上游热量数值，也未声称已做厨房实测。

新增 80 道世界菜谱现已全部使用独立生成示意图；原 20 张生成图继续复用，当前 100 道菜谱无来源库照片的页面引用。首轮保留的 77 张来源照片已按用户统一风格的要求逐道重新生成并替换，另 3 张是此前已生成的图片。新替换图使用米白餐具、暖米色背景、柔和自然光和俯视斜角构图，输出 900×900 JPG，并逐道结合当前用料及步骤核验。已移除 public 目录下的 77 张旧照片；原照片与旧目录另行保存在本机临时备份，不进入当前发布资源。

`data/world-image-manifest.json` 保存 80 张生成图的路径、完整提示词、工具、日期和哈希。77 张被替换照片的历史署名与来源仅保存在 `replacedImage` 审计字段中，不再显示为当前图片署名；菜谱原文仍保留 UniTools 的 CC BY-SA 4.0 归属，图片更换不移除菜谱数据许可。生成工具为内置 image_gen；原始 PNG 保留在工具默认生成目录，应用使用项目内压缩 JPG。

地域配额按实际取得的来源调整：并未照计划建议配额伪造“中国 38 道”等数量。当前国家分类分布可直接由 `data/catalog.js` 统计；总数仍为 100。

## 数据库升级与回退

新增且仅新增 `003_recipe_discovery.sql`。001/002 不改校验和；新增 kind/name_zh/role、分类字典与关联表及索引。seed 同步目录和关联，旧规范 ID 保持稳定，目录升级重算派生清单并提升 revision。移除目录菜谱仍需专门迁移，不能在此升级中静默删除。

已有数据库升级（先停止服务，用 V1 匹配源码备份）：

```sh
npm run db:backup -- /absolute/path/new-backup.sqlite
# 切换到本版源码后
npm run db:migrate
npm run db:seed -- --upgrade
npm run dev
```

全新隔离路径可用 `DB_PATH=/absolute/path/new.sqlite npm run db:init`。Windows 用相应终端环境变量语法。种子变更必须显式 `--upgrade`，不能删库代替升级。若升级失败，保持服务停止，使用对应源码和升级前备份恢复到新路径。

本次当前开发库在额外备份后以同一事务迁移并 seed；检查原有 5 条库存、2 道选择（含顺序）、4 条采购缺口逐行不变，SQLite integrity_check 为 ok。备份在本机 `/private/tmp/pantry-immediately-before-v2-discovery-20261107.sqlite`，不提交个人数据库。该临时备份路径会随系统清理，长期备份需另存。

## 验证证据

执行 `npm run check:v2-discovery`，实际结果：

| 检查 | 结果 |
| --- | --- |
| 规则/状态测试 | 30/30 |
| API | 12/12 |
| 数据库集成、迁移、服务重启及恢复 | 14/14 |
| Chromium 浏览器 | 11/11 |
| demo 断言 | 5/5，另计 |
| Vite 生产构建 | 通过 |

共 67 项测试；原 V1 场景保留。新增独立小目录夹具验证单条件、全条件、组内 OR/组间 AND、参数顺序、无结果、非法输入、分页无重复；schema 002 副本升级验证原 20 道用量不变及多菜数据保留。100 张图片经静态资源请求，80 张新增图经 JPEG 解码和清单哈希核验。

浏览器环境：macOS、Node 22.23.1、Chromium，1440×1000 和 375×812。验证页面标题/内容、无空白或框架错误层、相关 console/pageerror 为空；执行勾选筛选→详情→加购物清单→返回→刷新，确认条件与多菜选择保留。截图输出到系统临时目录，不提交。

本轮没有 GitHub Actions 新提交结果，没有实际 iPhone Safari/Android 真机或 Windows/Linux 新版本验收；不把手机视口当作真机结论。

## 后续边界

基于主食材的推荐排序、每日灵感、已购勾选、热量估算仍待实施；本次只建立它们可复用的分类与目录基础。公网、账号隔离和 iPhone App 沿用后续阶段决定。

## 2026-11-07 图片统一补充验收

77/77 张来源照片已独立生成、目视核对并替换；所有新文件均为 900×900 JPEG，SHA-256 与 manifest 一致，原 77 个照片路径已从 public 移除。当前目录的 100 道菜图片均标记为生成示意图，无 imageSourceUrl 外部照片引用。配方、分类和食材数量没有修改。

切换前备份：`/private/tmp/pantry-before-generated-photo-replacement-20261107.sqlite` 与 `/private/tmp/pantry-original-source-photos-20261107.zip`。目录 seed 后逐项比对 pantry、shoppingRecipeIds、shoppingRecipes 与 shopping 均不变。本次验证：构建通过，数据库/资产集成测试 14/14，Chromium 浏览器测试 11/11；实际运行服务的 100 张图片请求全部成功，当前外部照片引用为 0，相关控制台错误为空。检查了 1440×1000 桌面与 375×812 手机视口；本次未新增真机验收。
