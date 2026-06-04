# 🎮 MarinMC Launcher

Official Minecraft Launcher for the **MarinMC** network. Built with Electron + React + TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## ✨ Features

- **Custom Frameless Window** — Draggable titlebar with MarinMC branding
- **Splash Screen** — Animated loading screen with progress bar
- **Multi-language** — Turkish (TR) and English (EN) with instant switching
- **Server Selection** — Card-based UI with live player counts and server status
- **Game Launch** — Full download/verification/launch state machine
- **Settings Panel** — Slide-in drawer with Account, Launcher, Java, and Advanced sections
- **Mod Manager** — Server mods (locked) + custom mods with drag-and-drop, conflict detection
- **System Tray** — Background running, quick access menu
- **Auto-Updater** — GitHub Releases integration via `electron-updater`
- **Security** — Context isolation, no `nodeIntegration`, validated external links

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | Electron 28 |
| Frontend | React 18, TypeScript 5 |
| Styling | TailwindCSS 3 |
| State Management | Zustand 4 |
| Animations | Framer Motion 12 |
| Routing | React Router 6 |
| i18n | i18next + react-i18next |
| Icons | Lucide React |
| Build | Vite 5, electron-builder 24 |
| CI/CD | GitHub Actions |

## 📦 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- [Git](https://git-scm.com/)

### Install & Dev
```bash
# Clone the repository
git clone https://github.com/musbabaff/marinmc-launcher.git
cd marinmc-launcher

# Install dependencies
npm install

# Start development (renderer + electron)
npm run dev
```

### Build for Production
```bash
# Full build (renderer + electron + installer)
npm run build

# Platform-specific builds
npm run build:win    # Windows (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

Build output goes to the `release/` directory.

## 📁 Project Structure

```
marinmc-launcher/
├── assets/                  # Icons, images, installer assets
│   ├── icon.ico / .icns / .png
│   ├── tray-icon.png
│   ├── splash-bg.png
│   ├── installer-sidebar.bmp
│   ├── login-bg.jpg
│   └── logo.svg
├── electron/                # Electron main process
│   ├── main.ts              # App lifecycle, window creation
│   ├── preload.ts           # Context bridge (IPC)
│   ├── splash.ts            # Splash screen module
│   ├── splash.html          # Splash screen UI
│   ├── tray.ts              # System tray module
│   └── ipc/
│       ├── auth.ts          # Authentication handlers
│       ├── game.ts          # Game launch state machine
│       └── system.ts        # System info, dialogs, shell
├── src/                     # React renderer process
│   ├── App.tsx              # Router, layout, lazy loading
│   ├── main.tsx             # Entry point + i18n init
│   ├── index.css            # Global styles, scrollbar, glass
│   ├── components/
│   │   ├── TitleBar.tsx     # Custom frameless titlebar
│   │   └── SettingsPanel.tsx # Global settings drawer
│   ├── pages/
│   │   ├── LoginPage.tsx    # Login with cracked/Microsoft auth
│   │   ├── ServersPage.tsx  # Server selection grid
│   │   ├── ServerDetailPage.tsx # Server detail + launch
│   │   ├── SettingsPage.tsx # Legacy settings page
│   │   └── ModManagerPage.tsx # Mod management
│   ├── stores/
│   │   ├── authStore.ts     # Authentication state
│   │   └── settingsStore.ts # Settings with persistence
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── constants.ts     # App constants
│   │   └── i18n.ts          # i18next initialization
│   ├── locales/
│   │   ├── tr.json          # Turkish translations
│   │   └── en.json          # English translations
│   ├── auth/                # Auth service
│   └── types/               # TypeScript definitions
├── .github/workflows/
│   └── build.yml            # CI/CD: build + release
├── electron-builder.yml     # Installer configuration
├── package.json
├── tsconfig.json            # Renderer TypeScript config
├── tsconfig.node.json       # Electron TypeScript config
├── vite.config.ts           # Vite bundler config
└── tailwind.config.ts       # Tailwind theme config
```

## 🔒 Security

- All renderer ↔ main process communication uses `contextBridge` + `ipcRenderer.invoke`
- `nodeIntegration: false`, `contextIsolation: true`
- External links are validated against trusted domains
- No sensitive data stored in plaintext

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**MarinMC Minecraft Network** · [Website](https://marinmc.com) · [Discord](https://discord.gg/marinmc) · [Telegram](https://t.me/marinmc)
