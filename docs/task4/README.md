# Task 4 最小协作试验 / Minimal collaborative trial

目标：四人围绕 **T4-01 单道菜食材缺口**完成需求 → 分支 → PR → 评审 → 测试 → 合并 → 复盘。
这是准备好的骨架，尚未完成团队试验。每位成员以自己的账号完成下面的实质工作。
本次临时分工不改变 Task 3 的长期职责。

## 1. 克隆与调试

安装 Node.js 22 或更高版本（含 npm），执行：

```bash
git clone https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
npm test
npm run demo
```

无第三方依赖，不需要 npm install。
初始 npm test：1 个导出检查通过，5 个 TODO，不代表验收通过。
初始 demo：显示输入、预期和待实现提示，退出码 1；Peng 实现后显示 Actual。
最终命令 npm run test:final：初始会因 TODO 而失败，完成后必须全通过且没有 TODO。
调试可执行 node --inspect-brk examples/shortages-demo.js，或用 VS Code 的 Node.js 调试器。
临时修改 demo 中的库存数量，可以检查不同情形。

## 2. 每个人最少修改什么

| 成员 | 分支 | 最小修改 | 贡献证据 |
| --- | --- | --- | --- |
| ZheKai Mao | task4/requirements-evidence | 建需求 Issue；在 requirement.md 填 Issue 链接；最终填写 evidence.md | Issue、文档 PR、实际验收、3–5 句复盘 |
| Peng Ke | task4/shortages | 实现 src/calculate-shortages.js 的 TODO，约十几行 | 实现 PR、回应评审 |
| ChangPeng Shi | task4/tests | 将测试文件的 5 个 TODO 改为真实断言 | 测试 PR、对实现的具体评审 |
| HaoZhe Feng | task4/ci | 将 ci.example.yml 复制为 .github/workflows/test.yml | CI PR、Actions 链接、集成与权限检查 |

### ZheKai：需求与验收

打开 https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/new ，标题：
Task 4 / T4-01: calculate single-recipe shortages。
正文复制 [requirement.md](requirement.md)，补四人分工，确认需求后把编号告诉全组。
连接器创建 Issue 返回 403，所以当前没有自动创建 Issue，需成员在网页创建。
最终填写 [evidence.md](evidence.md)，提交文档 PR；人工验收填预期、实际、日期、结果。
请另一名成员从新目录克隆复现，记录环境、提交 SHA 与结果。

### Peng：计算函数

读 [requirement.md](requirement.md) 的数据约定。
按 ingredientId 找库存；不存在按 0；缺口为 max(需要量 − 已有量, 0)；只返回正缺口。
返回新对象，保持菜谱顺序，不修改输入。不加数据库或单位转换。
先运行 demo，测试集成后运行 npm run test:final。

### ChangPeng：断言与评审

已有 test/assert/函数 import；将每个 test.todo 改为 test(name, callback)。
用 assert.deepEqual 等真实断言覆盖 AC1–AC5。期望值手写，不用被测函数生成期望值。
AC5 可先复制输入，调用后比较；不要只检查函数存在。
评审 Peng 的 PR，说明检查了哪些条件，有问题具体指出，不必制造问题。
实现未合入时测试失败表示待集成，不可记录为通过。

### Hao：CI 与集成

```bash
mkdir -p .github/workflows
cp docs/task4/ci.example.yml .github/workflows/test.yml
```

提交 CI PR。工作流运行最终检查；骨架阶段失败是预期，全部集成后必须成功。
确认四人能推自己的分支；管理员在 Settings → Collaborators 邀请成员。
未掌握成员 GitHub 账号，所以没有预填 assignee 或发送邀请。
main 上记录成功的 Actions 链接，请第二位成员干净克隆复现。

## 3. 每人通用 Git 步骤

以下用 Peng 举例；其他成员换成自己的分支名和文件路径：

```bash
git switch main
git pull --ff-only
git switch -c task4/shortages
# 修改本人负责文件，运行相应检查
git add src/calculate-shortages.js
git commit -m "feat: implement T4-01 ingredient shortages"
git push -u origin task4/shortages
```

仓库 → Pull requests → New pull request，base 选 main。
PR 填关联 Issue（Related to #实际编号）、修改内容、测试命令及真实结果、评审人。
不要提前写 Closes #编号，避免仅合并实现就提前关闭整个需求。
实现由 ChangPeng 评审；测试由 Peng 评审；CI 由 Peng 或 ChangPeng 评审；文档由 Hao 复核。
保留具体评审和回应。不要用一个账号代替四个人提交。
合并后下一位拉最新 main；并行分支可在 PR 使用 Update branch 更新。

## 4. 完成顺序

1. ZheKai 创建/确认需求 Issue，全组先对齐输入输出。
2. Peng 实现、ChangPeng 写断言、Hao 配 CI，可以并行。
3. 交叉评审后合并；main 的 demo、最终检查和 Actions 全部成功。
4. 第二位成员干净克隆复现；ZheKai 填实际验收、贡献链接及复盘。
5. 文档 PR 合并，检查链接齐全，再手动关闭 Issue。

最终报告使用 evidence.md；提交 Issue、PR diff、具体评审、Actions 和验收链接，不能只交 commit 数。
