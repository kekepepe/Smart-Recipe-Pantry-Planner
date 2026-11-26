# Desktop Icon Provenance

All files in `desktop/icons/` are original project assets created for **Pantry & Plate** (Smart Recipe & Pantry Planner) and licensed under the repository's [MIT License](../../LICENSE).

- **Emblem source**: Derived directly from the project's `#245a42` botanical leaf emblem in [`public/favicon.svg`](../../public/favicon.svg) (also featured in `README.md` and `README.zh-CN.md`).
- **Master vectors**:
  - `icon-macos.svg` — 1024×1024 macOS icon following Apple HIG safe-area padding (824×824 squircle tile with warm botanical surface gradient `#ffffff` → `#e8efe5`).
  - `icon.svg` — 1024×1024 full-bleed rounded badge for Windows `.ico`, NSIS installer/uninstaller, and Electron window icon.
- **Generated deliverables** (reproducible via `node scripts/generate-desktop-icons.mjs` on macOS):
  - `icon.png` — 1024×1024 master PNG (`icon.svg`).
  - `icon-256.png` — 256×256 window icon PNG bundled into the Electron app (`desktop/main.js`).
  - `icon.icns` — multi-resolution macOS icon bundle (16×16 through 1024×1024, @1x and @2x) generated with macOS `iconutil`.
  - `icon.ico` — multi-resolution Windows icon (16, 24, 32, 48, 64, 128 px 32-bit BGRA BMP DIBs + 256 px PNG) compatible with Windows Explorer, Electron, and NSIS 3.
