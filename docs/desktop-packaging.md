# Pantry & Plate 桌面安装包

工作包见 [P06 #23](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/23)。首批候选包面向 macOS 15（Apple silicon，`.dmg`）与 Windows 11（x64，自包含 NSIS `.exe`）。上述版本和架构是本轮试装目标，正式支持范围以独立验收为准。macOS 候选使用 ad-hoc 签名，未公证。Windows 候选未做发布者签名。试装时记录系统实际提示和可用安装流程。

## 构建与核验

同一个 Git 提交分别在两台对应平台的构建机上执行以下命令。构建需要联网下载依赖及工具，安装和应用使用由包内的运行时、Express、本地 SQLite、迁移、菜谱和图片提供。

| 构建机 | 命令 |
| --- | --- |
| macOS arm64 | `npm ci`，`npm run package:desktop -- --mac --arm64` |
| Windows x64 | `npm ci`，`npm run package:desktop -- --win --x64` |

[Desktop installer candidates](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/workflows/desktop.yml) 在两个平台上从同一源码提交构建并试启动实际安装内容。每个通过的 job 提供安装包、`SHA256SUMS.txt` 和 `SOURCE_COMMIT.txt`。下载并解压 Actions artifact 后，用 `shasum -a 256 <文件>` 或 PowerShell 的 `Get-FileHash -Algorithm SHA256 <文件>` 核对。构建机测试使用临时用户目录，验证首次初始化、本地菜谱图片、加购物清单、目录升级备份和重启保留，独立断网试装由 Mao 和 Hao 执行。

## 安装与数据

1. 下载对应安装包并校验文件，再断网安装。macOS 打开 DMG，把 **Pantry & Plate** 拖到 **Applications**。Windows 启动安装程序，完成后从开始菜单打开 **Pantry & Plate**。
2. 首次打开自动创建本地数据库并载入菜谱。可使用示例库存，浏览带图菜谱，将缺料加入购物清单，关闭应用后重新启动核对数据。
3. 数据库位于 macOS 的 `~/Library/Application Support/Pantry & Plate/pantry.sqlite` 或 Windows 的 `%APPDATA%\Pantry & Plate\pantry.sqlite`。更新前退出应用并备份该文件。新版在同一目录读取数据，需要升级数据库或菜谱目录时会先写出 `pantry-before-upgrade-*.sqlite`。恢复时先退出应用并备份当前数据库，再用与目标版本兼容的备份替换数据库文件。
4. 菜谱的原始来源链接会在系统浏览器中打开，访问来源网页需要网络。应用内的菜谱、图片和许可文本随安装包提供。

两平台候选包完成独立验收后，正式 GitHub Release 使用同一固定提交对应的两份已验收安装包及校验值。
