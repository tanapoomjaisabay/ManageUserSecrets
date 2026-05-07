# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development (Electron + Vite HMR)
pnpm typecheck    # TypeScript check for both main and renderer (run before committing)
pnpm lint         # ESLint
pnpm build        # Typecheck + compile (no packager)
pnpm build:unpack # Build unpacked app for current platform
pnpm build:win    # Windows installer
pnpm build:mac    # macOS package (requires Xcode CLI tools)
pnpm build:linux  # Linux packages
```

There is **no test suite**. `pnpm typecheck` is the primary correctness check.

Kill stuck dev processes (Windows):
```powershell
taskkill /F /IM electron.exe /T; taskkill /F /IM node.exe /T
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173,5174 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Architecture

### Three-process Electron model

```
src/main/       — Node.js main process (file I/O, dialogs, IPC handlers)
src/preload/    — Bridge (contextBridge exposes electronAPI to renderer)
src/renderer/   — React SPA (no Node.js access)
```

All cross-process calls go through `ipcRenderer.invoke` / `ipcMain.handle` using `secrets:*` channel names.

### IPC error handling convention

Every IPC handler is wrapped in `wrapHandler()` (`src/main/ipc-handlers.ts`), which catches errors and returns `{ error: string }` instead of throwing. The renderer's `src/renderer/src/api.ts` unwraps this — `hasError()` detects the `{ error }` shape and re-throws as a real `Error`. Components only need to catch from `api.*` calls; they never see raw IPC payloads.

### Secrets storage

`src/main/secrets-service.ts` reads/writes directly to the platform secrets file — no `dotnet` CLI involvement for CRUD. The path is resolved from the `<UserSecretsId>` in the `.csproj` XML:

- **Windows**: `%APPDATA%\Microsoft\UserSecrets\{id}\secrets.json`
- **macOS/Linux**: `~/.microsoft/usersecrets/{id}/secrets.json`

`src/main/backup-service.ts` creates a timestamped `.bak` copy before any write, keeping the 10 most recent backups in the same directory.

### Renderer state flow

`App.tsx` holds two top-level state values: `currentProject` (null = show `WelcomePage`, set = show `ProjectPage`) and `recentProjects`. All navigation is a conditional render between these two pages — there is no router. Global keyboard shortcuts (`Ctrl+N`, `Ctrl+F`) are dispatched as `CustomEvent` on `window` and listened to by the relevant components.

### Settings persistence

`electron-store` (in `src/main/ipc-handlers.ts`) persists recent projects (max 10) in the platform user-data directory. No other persistent state exists.

### Path aliases

`@` and `@renderer` both resolve to `src/renderer/src/` (configured in `electron.vite.config.ts`).

### UI components

shadcn/ui components live in `src/renderer/src/components/ui/`. Tailwind CSS v4 is used via the `@tailwindcss/vite` plugin (no `tailwind.config` file needed).
