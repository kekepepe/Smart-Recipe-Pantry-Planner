# Pantry & Plate v1.0.1 Lite

Lite uses the Node.js installed on this computer and opens the system's default browser. All app assets and production dependencies are already in the ZIP.

## Start offline

1. Check that you have **Node.js 22.12 or newer from the Node.js 22 series** on PATH. Use native **arm64** Node.js on Apple silicon and **x64** Node.js on Windows.
2. Extract the platform ZIP. Double-click **Start Lite.command** on macOS or **Start Lite.cmd** on Windows. If you prefer the terminal, run `node lite/start.js` from the extracted folder.
3. Keep the launcher window open while using the app at `http://127.0.0.1:32101/`. Press **Ctrl+C** in that window to stop. Launching again while Lite runs opens the existing app. If another program uses the port, stop it or set `PANTRY_LITE_PORT` to a free port and launch again.

## Data and importing

Lite creates a separate database, `pantry.sqlite`, inside `~/Library/Application Support/Pantry & Plate Lite` on macOS or `%LOCALAPPDATA%\Pantry & Plate Lite` on Windows. You can select another data directory with `PANTRY_LITE_DATA_DIR`.

1. Quit the Electron app cleanly before making a copy of its v1.0.1 `pantry.sqlite`. If recovery sidecar files remain, use a consistent SQLite backup. Keep the source database intact.
2. With Lite stopped, run `node lite/start.js --import "/path/to/backup.sqlite"` in the extracted folder. The command verifies the backup and imports a separate copy into a new Lite data directory. If you already launched Lite, point `PANTRY_LITE_DATA_DIR` at a new directory for the import and subsequent starts.
3. Start Lite and check your inventory, recipe selection, shopping quantities and purchased marks. Keep the backup until you have verified the result.

中文版快速说明：先装好对应架构的 Node.js 22.12 或更高的 22.x，再解压双击对应启动文件。浏览器界面可切换中文。使用时保留启动窗口，按 Ctrl+C 停止。已有 Electron 数据请先退出旧版并制作 SQLite 备份，再用上面的导入命令复制到 Lite 的独立数据目录。
