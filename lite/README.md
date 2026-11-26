# Pantry & Plate v1.0.3 Lite

Lite is a ~28 MB native installer (**macOS `.dmg`** and **Windows `.exe`**) that reuses the Node.js installed on your computer and opens the app in your default browser—with no terminal window and all app assets and production dependencies already bundled.

## Install & start offline

1. Check that you have **Node.js 22.14 or newer from the Node.js 22 series** installed (native **arm64** Node.js on Apple silicon; **x64** Node.js on Windows).
2. **macOS:** Open `Pantry-and-Plate-1.0.3-Lite-mac-arm64.dmg`, drag **Pantry & Plate Lite.app** into **Applications**, and launch it (on first launch, use **Right-click → Open** or allow in *System Settings → Privacy & Security*). Control the background service from the menu bar icon (**Open Pantry & Plate** / **Quit Pantry & Plate Lite**).
3. **Windows:** Run `Pantry-and-Plate-1.0.3-Lite-win-x64.exe` (per-user install, no admin required) and launch **Pantry & Plate Lite** from the Desktop or Start Menu. Control the background service from the system tray icon.

## Data and importing

Lite creates a separate database, `pantry.sqlite`, inside `~/Library/Application Support/Pantry & Plate Lite` on macOS or `%LOCALAPPDATA%\Pantry & Plate Lite` on Windows. Uninstalling on Windows preserves your database. You can select another data directory with `PANTRY_LITE_DATA_DIR`.

1. Quit the Electron app cleanly before making a copy of its `pantry.sqlite`. Keep the source database intact.
2. With Lite stopped, run `node <app-dir>/lite/start.js --import "/path/to/backup.sqlite"` (on macOS `<app-dir>` is `/Applications/Pantry & Plate Lite.app/Contents/Resources/app`; on Windows it is `%LOCALAPPDATA%\Programs\Pantry & Plate Lite\app`).
3. Start Lite and verify your inventory, recipe selection, shopping quantities, and purchased marks.

## In-app updates (Lite only)

Lite stays offline by default and never connects to the internet on startup. When you are online, click **Check updates** in the header to check GitHub Releases for a lightweight Lite update bundle (`dist/`, `server/`, `src/`, `data/`). Lite verifies the bundle's SHA-256 digest before applying it into the writable `updates/` folder inside your user data directory and restarting automatically—keeping the installed app bundle and your `pantry.sqlite` database untouched. If an update fails to start, Lite automatically rolls back to the built-in version.

中文版快速说明：请先安装对应架构的 Node.js 22.14 或更高的 22.x。macOS 打开 `.dmg` 将 **Pantry & Plate Lite** 拖入「应用程序」即可直接打开（无终端黑框，可在顶部菜单栏打开界面或退出服务）；Windows 运行 `.exe` 安装程序即可通过桌面/开始菜单图标启动（系统托盘管理退出，卸载不删本地数据库）。联网时可点击顶部「检查更新」直接应用轻量增量更新包并自动重启（自动校验 SHA-256 并在异常时回滚）。
