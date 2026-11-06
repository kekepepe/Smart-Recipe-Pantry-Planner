# Peng Ke — demo 自动验收与故障验证

日期：2026-11-06（Asia/Shanghai）。由 Codex 在 Peng / `kekepepe` 的 macOS 工作区协助实现与验证。

关联：[Issue #1](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/1)、[本轮分工](README.md)。分支：`task4/demo-verification`。基线 main：`4946181975e3b91e51a5038f725f29a98f53cc2c`，已含 Feng 的 CI PR #2，工作流已有 `npm run demo`。

## 改动与原因

原 demo 只打印一项 Expected/Actual，返回错误数组不会触发失败。本次保留 `npm run demo` 入口，改为按 AC1–AC5 使用 `node:assert/strict` 验收；每项打印编号、输入、手写预期、实际和 PASS/FAIL，最后显示成功/失败数量。

AC1–AC4 分别覆盖库存不足、刚好、富余与缺失。AC5 使用两个食材，先核对手写缺口，再与调用前的 `structuredClone` 比较输入数组和对象；逐一检查每个输出对象都不是任一输入对象，修改每个输出数量后再验证输入不变。

每项异常由独立 catch 记录并设置 `process.exitCode = 1`，继续报告其余项；只有全部成功时进程退出 0。函数业务实现、原单元测试及 Feng 的工作流没有修改。

## 实际结果

环境：macOS arm64，Node.js v22.23.1，npm 10.9.8。

| 命令/情形 | 结果 | 退出码 |
| --- | --- | --- |
| `npm run demo` | AC1–AC5，5/5 passed，0 failed | 0 |
| `npm run test:final` | 16 pass，0 fail，0 skipped，0 todo | 0 |
| `npm run build` | Vite 构建成功 | 0 |
| 错误返回 `[]` | AC1、AC4、AC5 失败；其余两项通过 | 1 |
| 函数抛出异常 | 五项均失败，含 INJECTED_FAILURE | 1 |
| 算出正确缺口后修改输入 | AC1–AC4 通过，AC5 失败 | 1 |
| 零库存缺口直接返回原需求对象 | AC1–AC4 通过，AC5 引用独立性断言失败 | 1 |

故障验证的环境、命令、实际 PASS/FAIL 和退出码摘录见 [验证日志](evidence/peng-demo-validation.txt)。日志由实际 subprocess 运行结果筛选生成；stdout/stderr 合并后列出，行顺序不表示原终端交错顺序。

## 如何复现负向验证

在仓库根目录执行以下 Python 命令。它仅在系统临时目录复制 demo 并替换计算函数，不修改工作树；临时目录退出后自动删除。预期打印 exit=1，且含 FAIL AC1。错误函数没有提交到仓库。

```bash
python3 - <<'PYCODE'
from pathlib import Path
import json, shutil, subprocess, tempfile
repo = Path.cwd()
with tempfile.TemporaryDirectory(prefix='peng-demo-') as folder:
    target = Path(folder)
    (target / 'examples').mkdir()
    (target / 'src').mkdir()
    shutil.copy2(repo / 'examples/shortages-demo.js', target / 'examples/shortages-demo.js')
    (target / 'src/calculate-shortages.js').write_text(
        'export function calculateShortages() { return []; }\n')
    (target / 'package.json').write_text(json.dumps({
        'type': 'module', 'scripts': {'demo': 'node examples/shortages-demo.js'}}))
    result = subprocess.run(['npm', 'run', 'demo'], cwd=target, capture_output=True, text=True)
    print(result.stdout, result.stderr)
    print('exit=' + str(result.returncode))
    assert result.returncode == 1
    assert 'FAIL AC1' in result.stderr
PYCODE
```

其余故障同样使用独立临时副本：异常函数始终抛出 `Error("INJECTED_FAILURE")`；输入修改函数在正确计算后、仅对多食材夹具将 pantry[0].quantity 设为 999；对象复用函数在正缺口等于原需求数量时直接返回原需求对象。正常源码始终保留不变。

## 协作状态

实现、正常验证及负向验证已完成，提交本分支 PR 关联 `Related to #1`，供 ChangPeng 交叉评审。用户已确认 ChangPeng 的账号为 `Lsiav`，PR 创建时请求其评审。

核查时没有开放的 ChangPeng 新增回归测试 PR，Peng 对该 PR 的评审仍待其提交后进行。ChangPeng 对本 PR 的评审、Peng 对实际意见的回应、合并及集成 main 的成功 Checks 必须按后续活动补充；本记录不把这些步骤记为完成，也不代表 Mao 的独立复现或人工验收。
