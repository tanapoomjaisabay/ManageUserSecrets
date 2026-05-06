# dotnet user-secrets UI Manager — Implementation Plan

## Overview

Cross-platform **Electron desktop app** (React + TypeScript) สำหรับจัดการ `dotnet user-secrets`  
อ่าน/เขียน `secrets.json` โดยตรงโดยไม่พึ่ง CLI สำหรับ CRUD ทำให้เร็วและไม่ต้องการ dotnet SDK สำหรับทุก operation

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop Framework | Electron | Cross-platform, filesystem + process access |
| Frontend | React + TypeScript | Type-safe, component-based |
| Build Tool | electron-vite | Fast HMR, modern bundler |
| UI Components | shadcn/ui + Tailwind CSS | Polished, accessible, customizable |
| App Settings | electron-store | Persist recent projects list |
| XML Parsing | fast-xml-parser | Parse .csproj to extract UserSecretsId |
| Package Manager | pnpm | Fast, disk-efficient |

---

## Architecture

```
ManageUserSecrets/
├── src/
│   ├── main/                          # Electron Main Process (Node.js)
│   │   ├── index.ts                   # App entry, BrowserWindow setup
│   │   ├── ipc-handlers.ts            # All IPC channel registrations
│   │   ├── secrets-service.ts         # Core: parse .csproj, CRUD on secrets.json
│   │   └── backup-service.ts          # Timestamped backup before mutation
│   ├── preload/
│   │   └── index.ts                   # contextBridge API (renderer ↔ main bridge)
│   └── renderer/
│       ├── index.html
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Root component, routing/tab state
│       ├── api.ts                     # Typed wrapper over window.electronAPI
│       ├── pages/
│       │   ├── WelcomePage.tsx        # Landing: CTA + recent projects
│       │   └── ProjectPage.tsx        # Main secrets management view
│       └── components/
│           ├── SecretsTable.tsx       # Table: search, copy, edit, delete actions
│           ├── SecretFormDialog.tsx   # Modal: add/edit secret (key + value)
│           └── ImportExportPanel.tsx  # JSON import/export controls
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## Core Logic

### secrets.json Path Resolution

| OS | Path |
|---|---|
| Windows | `%APPDATA%\Microsoft\UserSecrets\{UserSecretsId}\secrets.json` |
| macOS | `~/.microsoft/usersecrets/{UserSecretsId}/secrets.json` |
| Linux | `~/.microsoft/usersecrets/{UserSecretsId}/secrets.json` |

### .csproj Parsing (XML)

```xml
<!-- Look for this element in .csproj -->
<PropertyGroup>
  <UserSecretsId>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</UserSecretsId>
</PropertyGroup>
```

### secrets.json Format

```json
{
  "ConnectionStrings:DefaultConnection": "Server=localhost;Database=MyDb",
  "Authentication:ApiKey": "secret123",
  "Logging:LogLevel:Default": "Debug"
}
```

Keys use colon `:` as hierarchy separator (flat JSON, displayed as-is).

---

## IPC Channels

| Channel | Direction | Input | Output |
|---|---|---|---|
| `secrets:open-project` | renderer → main | — | `{ projectName, projectPath, userSecretsId, secretsPath }` |
| `secrets:list` | renderer → main | `projectPath` | `Record<string, string>` |
| `secrets:set` | renderer → main | `{ projectPath, key, value }` | `{ success: boolean }` |
| `secrets:delete` | renderer → main | `{ projectPath, key }` | `{ success: boolean }` |
| `secrets:import` | renderer → main | `projectPath` | `{ merged: number }` |
| `secrets:export` | renderer → main | `projectPath` | `{ filePath: string }` |
| `secrets:init` | renderer → main | `projectPath` | `{ userSecretsId: string }` |

---

## Features

| Feature | Description |
|---|---|
| Browse & Open | File dialog เลือก `.csproj` file |
| Secrets Table | แสดง key/value ทุก secret + search/filter by key or value |
| Add / Edit | Modal form: key (text) + value (textarea) + Save |
| Delete | Confirm dialog ก่อนลบ |
| Copy to Clipboard | Single-click copy value button in table row |
| Import JSON | File dialog เลือก JSON → merge หรือ overwrite |
| Export JSON | Save dialog → write `secrets.json` clone |
| Auto-Backup | สร้าง `secrets.{timestamp}.json.bak` ก่อน mutation ทุกครั้ง |
| Recent Projects | Remember `.csproj` paths ที่เคยเปิด (electron-store) |
| Init Support | หาก `.csproj` ไม่มี `UserSecretsId` → ปุ่ม "Initialize" รัน `dotnet user-secrets init` |
| Error Toasts | แสดง error: file not found, permission denied, invalid JSON |

---

## Implementation Phases

### Phase 1 — Project Scaffold

- [ ] 1.1 Init project ด้วย `electron-vite` template (React + TypeScript)
  ```bash
  pnpm create @quick-start/electron manage-user-secrets --template react-ts
  ```
- [ ] 1.2 ติดตั้ง dependencies
  ```bash
  pnpm add fast-xml-parser electron-store
  pnpm add -D tailwindcss @tailwindcss/vite
  pnpm dlx shadcn@latest init
  pnpm dlx shadcn@latest add button input table dialog toast badge
  ```
- [ ] 1.3 ตั้งค่า Tailwind CSS ใน `electron.vite.config.ts`
- [ ] 1.4 ตั้งค่า TypeScript paths (`@/` → `src/renderer/`)
- [ ] 1.5 ยืนยัน `pnpm dev` เปิด Electron ได้

---

### Phase 2 — Main Process (Backend Logic)

- [ ] 2.1 **`secrets-service.ts`**
  - `openProjectDialog()` — `dialog.showOpenDialog` filter `.csproj`
  - `parseUserSecretsId(csprojPath)` — `fast-xml-parser` หา `<UserSecretsId>`
  - `resolveSecretsPath(userSecretsId)` — OS-aware path resolution
  - `listSecrets(csprojPath)` → `Record<string, string>` — read + parse `secrets.json`
  - `setSecret(csprojPath, key, value)` — backup + update key in `secrets.json`
  - `deleteSecret(csprojPath, key)` — backup + remove key from `secrets.json`
  - `importSecrets(csprojPath, filePath)` — backup + merge JSON file
  - `exportSecrets(csprojPath)` — `dialog.showSaveDialog` + write JSON
  - `initUserSecrets(csprojPath)` — `child_process.execFile('dotnet', ['user-secrets', 'init', '--project', csprojPath])`

- [ ] 2.2 **`backup-service.ts`**
  - `backup(secretsPath)` — copy `secrets.json` → `secrets.{ISO_timestamp}.json.bak` ในโฟลเดอร์เดียวกัน
  - จัดการกรณี `secrets.json` ยังไม่มี (ไม่ต้อง backup)
  - Limit backup files to last 10 (ลบเก่าออก)

- [ ] 2.3 **`ipc-handlers.ts`**
  - Register handler ทุก channel ด้วย `ipcMain.handle()`
  - Wrap ทุก handler ด้วย try-catch → return `{ error: string }` เมื่อ fail

- [ ] 2.4 **`main/index.ts`**
  - ตั้งค่า `BrowserWindow` (width: 1100, height: 720, minWidth: 800)
  - Enable `contextIsolation: true`, `nodeIntegration: false`
  - Load preload script
  - Import และ register IPC handlers
  - ตั้งค่า `electron-store` สำหรับ recent projects

---

### Phase 3 — Preload Bridge

- [ ] 3.1 **`preload/index.ts`**
  ```typescript
  contextBridge.exposeInMainWorld('electronAPI', {
    openProject: () => ipcRenderer.invoke('secrets:open-project'),
    listSecrets: (projectPath) => ipcRenderer.invoke('secrets:list', projectPath),
    setSecret: (projectPath, key, value) => ipcRenderer.invoke('secrets:set', { projectPath, key, value }),
    deleteSecret: (projectPath, key) => ipcRenderer.invoke('secrets:delete', { projectPath, key }),
    importSecrets: (projectPath) => ipcRenderer.invoke('secrets:import', projectPath),
    exportSecrets: (projectPath) => ipcRenderer.invoke('secrets:export', projectPath),
    initUserSecrets: (projectPath) => ipcRenderer.invoke('secrets:init', projectPath),
    getRecentProjects: () => ipcRenderer.invoke('secrets:recent-projects'),
  })
  ```
- [ ] 3.2 สร้าง `renderer/api.ts` — typed wrapper ครอบ `window.electronAPI`

---

### Phase 4 — UI Components

- [ ] 4.1 **`WelcomePage.tsx`**
  - ปุ่ม "Open Project (.csproj)" — เรียก `api.openProject()`
  - Recent projects list (clickable rows)
  - Empty state เมื่อยังไม่มี recent projects

- [ ] 4.2 **`SecretsTable.tsx`**
  - Table columns: Key | Value | Actions
  - Search bar (filter by key หรือ value)
  - Value cell: masked `••••••` toggleable + copy button
  - Row actions: Edit (ดินสอ icon) | Delete (trash icon)
  - Empty state เมื่อ secrets ว่าง

- [ ] 4.3 **`SecretFormDialog.tsx`**
  - Mode: Add (key + value) หรือ Edit (value เท่านั้น key readonly)
  - Key validation: ห้ามว่าง, แจ้งเตือน duplicate
  - Value: `<Textarea>` รองรับ multiline
  - Buttons: Cancel | Save

- [ ] 4.4 **`ImportExportPanel.tsx`**
  - Import: ปุ่ม + radio (Merge / Overwrite)
  - Export: ปุ่ม save JSON

- [ ] 4.5 **`ProjectPage.tsx`**
  - Header: ชื่อโปรเจค + path + UserSecretsId badge
  - Toolbar: Search | Add Secret | Import | Export | Refresh
  - `<SecretsTable />`
  - กรณี `UserSecretsId` ไม่มี: แสดง banner + ปุ่ม "Initialize User Secrets"

- [ ] 4.6 **`App.tsx`**
  - State: `currentProject` (null = WelcomePage, มีค่า = ProjectPage)
  - Recent projects state (sync กับ main process)
  - Toast provider (`<Toaster />`)

---

### Phase 5 — Polish & Edge Cases

- [ ] 5.1 Error handling: แสดง toast เมื่อ IPC return `{ error }`
- [ ] 5.2 Loading states บน async operations (skeleton/spinner)
- [ ] 5.3 Confirm dialog ก่อน Delete secret
- [ ] 5.4 Confirm dialog ก่อน Import (Overwrite mode)
- [ ] 5.5 Window title: `{projectName} — User Secrets Manager`
- [ ] 5.6 Keyboard shortcuts:
  - `Ctrl+N` / `Cmd+N` → Add new secret
  - `Ctrl+F` / `Cmd+F` → Focus search
  - `Escape` → Close dialog / Clear search
- [ ] 5.7 กรณี secrets.json เป็น invalid JSON → แสดง error + ปุ่ม "View Raw File"

---

## Edge Cases Handled

| Scenario | Handling |
|---|---|
| `.csproj` ไม่มี `<UserSecretsId>` | แสดง banner + ปุ่ม "Initialize" รัน `dotnet user-secrets init` |
| `secrets.json` ยังไม่มี | แสดง empty state, สร้าง file อัตโนมัติเมื่อ set secret แรก |
| `secrets.json` เป็น invalid JSON | แสดง error toast + ปุ่ม "View Raw File" |
| Permission denied | แสดง error toast พร้อม path ที่ไม่สามารถเข้าถึงได้ |
| dotnet SDK ไม่ติดตั้ง (สำหรับ init) | แสดง error message แนะนำให้ติดตั้ง SDK |
| Key ซ้ำกันเมื่อ Import | Merge: overwrite ด้วยค่าใหม่, แจ้งจำนวน key ที่ overwrite |

---

## Security Considerations

- ใช้ `contextIsolation: true` และ `nodeIntegration: false` (Electron best practice)
- ทุก IPC handler validate input ก่อน process (path traversal check)
- ไม่ log secret values ใน console หรือ error messages
- Backup files เก็บใน user secrets directory (เดิม) ไม่ใช่ที่อื่น
- ไม่ส่ง secret values ออก network

---

## Verification Checklist

- [ ] `pnpm dev` → Electron window เปิดได้ปกติ ไม่มี console error
- [ ] เปิด `.csproj` จริง → secrets โหลดแสดงถูกต้อง
- [ ] Add secret → `secrets.json` update + backup file ถูกสร้าง
- [ ] Edit secret → ค่าเปลี่ยน + backup สร้าง
- [ ] Delete secret → key หาย + backup สร้าง
- [ ] Import JSON (Merge) → secrets merge ถูกต้อง ไม่ลบ existing
- [ ] Import JSON (Overwrite) → secrets ถูก replace ทั้งหมด
- [ ] Export → JSON file เขียนออกที่เลือก, content ถูกต้อง
- [ ] Search → filter key และ value ได้ real-time
- [ ] Copy to clipboard → value ถูก copy
- [ ] Value masking → toggle show/hide ได้
- [ ] Recent projects → persist หลัง reopen app
- [ ] `.csproj` ไม่มี UserSecretsId → banner + Initialize ทำงาน
- [ ] Test path resolution บน Windows (`%APPDATA%`) และ macOS (`~/.microsoft`)
- [ ] `pnpm build` → build สำเร็จ ไม่มี TypeScript error

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| อ่าน/เขียน `secrets.json` โดยตรง (ไม่ผ่าน CLI) | เร็วกว่า, ไม่ต้องการ dotnet SDK สำหรับ CRUD |
| ใช้ CLI เฉพาะ `dotnet user-secrets init` | CLI จำเป็นสำหรับแก้ `.csproj` (generate + inject UserSecretsId) |
| Flat key-value display (ไม่ทำ tree view) | Simple, ตรงกับที่ dotnet เก็บ, ป้องกัน edge case key มี colon |
| Auto-backup ก่อนทุก mutation | ป้องกัน data loss โดยไม่ต้องให้ user กด backup เอง |
| Value masking (show/hide) | ป้องกัน shoulder surfing |
