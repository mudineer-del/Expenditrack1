# Electron Desktop App Setup

## Overview
Build native desktop apps (Windows, macOS, Linux) from your React codebase using Electron.

## Quick Start

### 1. Install Electron Dependencies
```bash
npm install electron electron-builder --save-dev
npm install electron-store
npm install electron-squirrel-startup
```

### 2. Project Structure
```
expenditrack/
├── electron/
│   ├── main.ts           # Main process
│   ├── preload.ts        # Preload script
│   ├── ipc.ts            # IPC handlers
│   └── menu.ts           # Menu configuration
├── src/                  # React app (shared with web)
├── dist/                 # Built React app
├── build/                # Electron build output
├── package.json
└── electron-builder.yml  # Build configuration
```

### 3. Create Main Process (`electron/main.ts`)
```typescript
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import isDev from 'electron-is-dev'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  })

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`

  mainWindow.loadURL(startUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  createWindow()
  createMenu()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-app-path', () => app.getAppPath())
```

### 4. Create Preload Script (`electron/preload.ts`)
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, args: any) => ipcRenderer.send(channel, args),
    invoke: (channel: string, args: any) => ipcRenderer.invoke(channel, args),
    on: (channel: string, func: any) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    removeListener: (channel: string, func: any) =>
      ipcRenderer.removeListener(channel, func),
  },
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, args: any) => void
        invoke: (channel: string, args: any) => Promise<any>
        on: (channel: string, func: any) => void
        removeListener: (channel: string, func: any) => void
      }
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}
```

### 5. Create Menu (`electron/menu.ts`)
```typescript
import { app, Menu, BrowserWindow } from 'electron'

export function createMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        { role: 'exit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Show about dialog
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
```

### 6. Update `package.json`
```json
{
  "main": "electron/main.ts",
  "homepage": "./",
  "scripts": {
    "dev": "concurrently \"npm run dev:react\" \"npm run dev:electron\"",
    "dev:react": "vite",
    "dev:electron": "electron .",
    "build": "npm run build:react && npm run build:electron",
    "build:react": "vite build",
    "build:electron": "electron-builder",
    "start": "electron ."
  },
  "build": {
    "appId": "com.ogdcl.expenditrack",
    "productName": "Expenditrack",
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "directories": {
      "buildResources": "assets"
    },
    "win": {
      "target": ["nsis", "portable"],
      "certificateFile": null,
      "certificatePassword": null
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.business"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    }
  }
}
```

### 7. Install Additional Dev Dependencies
```bash
npm install concurrently electron-is-dev --save-dev
npm install typescript --save-dev
```

### 8. Create Electron Config (`electron-builder.yml`)
```yaml
appId: com.ogdcl.expenditrack
productName: Expenditrack
directories:
  buildResources: assets
  output: build

files:
  - dist/**/*
  - electron/**/*
  - node_modules/**/*
  - package.json

win:
  target:
    - nsis
    - portable
  certificateFile: null

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

mac:
  target:
    - dmg
    - zip
  category: public.app-category.business
  hardenedRuntime: true

linux:
  target:
    - AppImage
    - deb
  category: Office
```

## Development

### Run in Development Mode
```bash
npm run dev
```
This starts both the React dev server and Electron simultaneously.

### Build for Production

**All Platforms:**
```bash
npm run build
```

**Specific Platform:**
```bash
# Windows
npm run build:electron -- --win

# macOS
npm run build:electron -- --mac

# Linux
npm run build:electron -- --linux
```

## Features to Add

### Keyboard Shortcuts
```typescript
// In electron/main.ts
import { globalShortcut } from 'electron'

app.on('ready', () => {
  createWindow()
  
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+N', () => {
    // Open new invoice
  })
  
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit()
  })
})
```

### Auto-Update
```typescript
import { autoUpdater } from 'electron-updater'

function createWindow() {
  mainWindow = new BrowserWindow({...})
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify()
}
```

### Local Storage
```typescript
import Store from 'electron-store'

const store = new Store()

ipcMain.handle('get-setting', (event, key) => {
  return store.get(key)
})

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value)
})
```

### File Dialogs
```typescript
import { dialog } from 'electron'

ipcMain.handle('open-file', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'Excel', extensions: ['xlsx'] },
    ],
  })
  return filePaths[0]
})
```

## Signing & Notarization

### macOS (required for distribution)
```bash
# Setup code signing
# 1. Create certificates in Apple Developer
# 2. Export as p12 file
# 3. Set environment variables:

export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
export APPLE_ID=your-apple-id@example.com
export APPLE_ID_PASSWORD=app-specific-password
export TEAM_ID=your-team-id

npm run build
```

## Distribution

### Windows
- NSIS installer (exe)
- Portable executable
- Microsoft Store (optional)

### macOS
- DMG installer
- Direct download (zip)
- Mac App Store (optional)

### Linux
- AppImage (portable)
- DEB (Debian/Ubuntu)
- Snap (optional)

## Troubleshooting

**White screen on startup:**
```typescript
// Ensure dev server is running when developing
// Check localhost:5173 is accessible
mainWindow.loadURL('http://localhost:5173')
```

**IPC errors:**
```bash
# Clear build cache
rm -rf build node_modules/.cache
npm install
npm run build
```

**Code signing errors (macOS):**
```bash
# Skip signing for development
electron-builder --mac --no-sign
```

## Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure auto-updates
3. Test on all platforms
4. Submit to stores (Windows Store, Mac App Store)
5. Create installer/update system
