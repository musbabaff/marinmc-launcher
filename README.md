# MarinMC Launcher

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](https://nodejs.org)
[![Electron Version](https://img.shields.io/badge/electron-28+-brightgreen.svg)](https://www.electronjs.org)
[![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Official, branded Minecraft launcher for the **MarinMC Network**, built with Electron, React, TypeScript, Vite, and Zustand.

---

## Features

- **Frameless UI**: Modern dark-themed dashboard (960x600 size constraints).
- **Custom Titlebar**: Native window operations (minimize, close) mapped via secure IPC context bridges.
- **Cracked & Premium Auth**: Dual authentication flows allowing Microsoft Xbox Live logins and offline names.
- **Server Hub**: Real-time server status, player capacity counts, and ping latency metrics.
- **Launch Configurations**: In-app slider configurations for physical memory allocation (RAM), java executables, and custom JVM arguments.
- **Live Output Stream**: Implements logging terminals monitoring client launch status.
- **Auto Updater**: Integrated `electron-updater` querying GitHub Releases for launcher upgrades.

---

## Tech Stack

- **Framework**: Electron (v28+)
- **UI Engine**: React (v18+) + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Packager**: electron-builder
- **Auto-Update**: electron-updater

---

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org) (v20+) installed on your machine.

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts the Vite dev server for the React UI and boots the Electron main process concurrently:
```bash
npm run dev
```

### 3. Package Application
Bundles React assets and compiles TypeScript sources into self-contained executable packages:
- **Windows (NSIS)**: `npm run build:win`
- **macOS (DMG)**: `npm run build:mac`
- **Linux (AppImage)**: `npm run build:linux`
- **All Targets**: `npm run build`

---

## License

This project is licensed under the [MIT License](LICENSE) - see the file for details.
