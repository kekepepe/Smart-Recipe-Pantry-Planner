# 菜谱目录与来源

V1 共 20 道：原有两道回归样例 + 18 道家常菜改编。目录不依赖运行时外部 API，种子源为 `data/catalog.js`。

## 来源选择

本轮查阅了 Wikibooks Cookbook 与 HowToCook。采用 [Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)，因其家常菜范围与本项目一致、包含逐项用量和步骤，且仓库 [LICENSE](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/LICENSE) 为 Unlicense。许可原文随选取的 Markdown 快照保存在 `data/sources/howtocook/LICENSE`。不因某个菜谱网站可公开浏览就假定其整库可复用。

上游固定提交：`308cc8b7dab1da84b20e7fafdf836a715437f582`；取得日期 2026-11-06。`provenance.json` 保存每道原路径、blob SHA 与永久链接。保留 HowToCook contributors 归属。原文快照仅用于追溯，内嵌图片仍指向上游相对文件；本项目不复制或热链它们。

## 规范化决定

- 逐条人工整理为固定份数、piece/g/ml 的规范 ID 需求；所有列出的配料均参与匹配，水除外；可选配料不悄悄加入必需需求。
- “适量”、范围、整包、半个蔬菜、蒜瓣等改为本项目选择的固定配方，并在 adaptationNotes 标注。它们是编辑选择，不是通用密度/重量换算，也不宣称保留原作者实测份量。
- 熟米饭与生米分开，预制蒜蓉酱与大蒜分开，方便面包含其调料包；不将不兼容食材或单位混算。
- 麻婆豆腐采用上游的咸鸭蛋白变体，标题明确区分；葱煎豆腐、红烧肉等的份量调整单独说明。
- 英文步骤为简化改编；去掉上游未核验的健康/热量叙述，不提供 kcal 数据；V2 再独立核对营养来源。
- 个别固定烹调时间改为熟透/凝固的判断，份数与分钟数为本项目展示配方，不冒充厨房实测成果。

## 20 道目录

| ID | 中文 | 类别 | 来源 |
| --- | --- | --- | --- |
| scrambled-eggs | 简易炒蛋 | Demo | 项目原创，V0 回归夹具 |
| tomato-skillet | 暖煎番茄 | Demo | 项目原创，V0 回归夹具 |
| tomato-eggs | 西红柿炒鸡蛋 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E8%A5%BF%E7%BA%A2%E6%9F%BF%E7%82%92%E9%B8%A1%E8%9B%8B.md) |
| egg-fried-rice | 蛋炒饭 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/staple/%E8%9B%8B%E7%82%92%E9%A5%AD.md) |
| milk-oats | 牛奶燕麦配煎蛋 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/breakfast/%E7%89%9B%E5%A5%B6%E7%87%95%E9%BA%A6.md) |
| steamed-eggs | 蒸水蛋 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/breakfast/%E8%92%B8%E6%B0%B4%E8%9B%8B.md) |
| egg-sandwich | 鸡蛋三明治 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/breakfast/%E9%B8%A1%E8%9B%8B%E4%B8%89%E6%98%8E%E6%B2%BB.md) |
| garlic-broccoli | 蒜蓉西兰花 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E8%92%9C%E8%93%89%E8%A5%BF%E5%85%B0%E8%8A%B1.md) |
| sour-spicy-potatoes | 酸辣土豆丝 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E9%85%B8%E8%BE%A3%E5%9C%9F%E8%B1%86%E4%B8%9D.md) |
| smashed-cucumber | 凉拌黄瓜 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E5%87%89%E6%8B%8C%E9%BB%84%E7%93%9C.md) |
| cabbage-pork | 手撕包菜 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E6%89%8B%E6%92%95%E5%8C%85%E8%8F%9C/%E6%89%8B%E6%92%95%E5%8C%85%E8%8F%9C.md) |
| mapo-tofu | 咸蛋版麻婆豆腐 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/meat_dish/%E9%BA%BB%E5%A9%86%E8%B1%86%E8%85%90/%E9%BA%BB%E5%A9%86%E8%B1%86%E8%85%90.md) |
| scallion-tofu | 葱煎豆腐 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/vegetable_dish/%E8%91%B1%E7%85%8E%E8%B1%86%E8%85%90.md) |
| cola-wings | 可乐鸡翅 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/meat_dish/%E5%8F%AF%E4%B9%90%E9%B8%A1%E7%BF%85.md) |
| braised-pork | 简易红烧肉 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/meat_dish/%E7%BA%A2%E7%83%A7%E8%82%89/%E7%AE%80%E6%98%93%E7%BA%A2%E7%83%A7%E8%82%89.md) |
| tomato-beef | 西红柿牛腩 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/meat_dish/%E8%A5%BF%E7%BA%A2%E6%9F%BF%E7%89%9B%E8%85%A9/%E8%A5%BF%E7%BA%A2%E6%9F%BF%E7%89%9B%E8%85%A9.md) |
| garlic-shrimp | 蒜蓉虾 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/aquatic/%E8%92%9C%E8%93%89%E8%99%BE/%E8%92%9C%E8%93%89%E8%99%BE.md) |
| steamed-sea-bass | 清蒸鲈鱼 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/aquatic/%E6%B8%85%E8%92%B8%E9%B2%88%E9%B1%BC/%E6%B8%85%E8%92%B8%E9%B2%88%E9%B1%BC.md) |
| seaweed-egg-soup | 紫菜蛋花汤 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/soup/%E7%B4%AB%E8%8F%9C%E8%9B%8B%E8%8A%B1%E6%B1%A4.md) |
| stir-fried-noodles | 炒方便面 | 家常菜 | [固定版本原文](https://github.com/Anduin2017/HowToCook/blob/308cc8b7dab1da84b20e7fafdf836a715437f582/dishes/staple/%E7%82%92%E6%96%B9%E4%BE%BF%E9%9D%A2/%E7%82%92%E6%96%B9%E4%BE%BF%E9%9D%A2.md) |

## 图片

两道 V0 图片继续复用，18 道新增菜使用 built-in imagegen 逐道生成。统一白色陶瓷、暖米色桌面、自然光的风格；文件位于 `public/images/recipes/`，最大边 900px 的 JPEG 副本总计约 4 MB，PNG 原稿保留在生成目录。

`data/image-manifest.json` 保存全部 18 条生成提示和最终路径。页面标注为 AI 插图；它们不是本项目实际烹制菜品的照片，不承诺逐粒食材数量或盘中份量。没有使用远程图片热链或带水印素材。

全部 20 个图片路径经 HTTP 与浏览器解码检查；另以 5×4 缩略总览人工目视核对菜名、主体、风格与明显错配。
