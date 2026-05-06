# Fix Code Review Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 bugs (1 critical, 5 important) found during pre-PR code review of the ManageUserSecrets Electron app.

**Architecture:** All fixes are surgical edits to existing files. No new files needed. Changes are independent — each task can be applied and committed separately. There are no automated tests; each task includes manual verification steps that can be run in the dev server.

**Tech Stack:** Electron 39, React 19, TypeScript 5.9, electron-vite, shadcn/ui

---

## Files Touched

| File | Tasks |
|------|-------|
| `src/main/secrets-service.ts` | Task 1, 2, 3, 4 |
| `src/main/index.ts` | Task 5 |
| `src/renderer/src/components/SecretsTable.tsx` | Task 6 |

---

### Task 1: Fix `getFocusedWindow()` null crash — 4 call sites in secrets-service.ts

**Problem:** `BrowserWindow.getFocusedWindow()!` returns `null` when no window is focused (especially on macOS where the app survives window close). Passing `null` as parent to Electron dialogs crashes the main process.

**Files:**
- Modify: `src/main/secrets-service.ts` (lines 65, 163, 194, 224)

- [ ] **Step 1: Open `src/main/secrets-service.ts` and locate the four dialog call sites**

  The four functions that use `BrowserWindow.getFocusedWindow()!`:
  - `openProjectDialog()` — line ~65
  - `importSecrets()` — line ~163
  - `importSecretsOverwrite()` — line ~194
  - `exportSecrets()` — line ~224

  Each has this pattern:
  ```ts
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window!, { ... })
  ```

- [ ] **Step 2: Replace all four occurrences with a null-safe fallback**

  Replace every `BrowserWindow.getFocusedWindow()` call with:
  ```ts
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  ```
  And change the dialog call from `dialog.showOpenDialog(window!, ...)` to `dialog.showOpenDialog(win, ...)`.

  After the fix, `openProjectDialog()` looks like:
  ```ts
  export async function openProjectDialog(): Promise<ProjectInfo | null> {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Open .csproj Project',
      filters: [{ name: 'C# Project', extensions: ['csproj'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return null

    return getProjectInfo(result.filePaths[0])
  }
  ```

  Apply the same pattern to `importSecrets()`, `importSecretsOverwrite()`, and `exportSecrets()` — change `window!` → `win` and `const window = BrowserWindow.getFocusedWindow()` → `const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]` in each.

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Manual verification**

  ```bash
  pnpm dev
  ```
  Open a `.csproj` file, then click elsewhere to defocus the window, then try Import/Export. Should work without crash.

- [ ] **Step 5: Commit**

  ```bash
  git add src/main/secrets-service.ts
  git commit -m "fix: replace getFocusedWindow()! with null-safe fallback in dialog calls"
  ```

---

### Task 2: Add JSON parse error handling and shape validation to import functions

**Problem A:** `JSON.parse(content)` in both import functions throws a raw `SyntaxError` with file content fragments in the message if the file is malformed.
**Problem B:** No shape validation — arrays, nulls, or nested objects pass through and corrupt `secrets.json`.

**Files:**
- Modify: `src/main/secrets-service.ts` (the `importSecrets` and `importSecretsOverwrite` functions)

- [ ] **Step 1: Add a helper function for safe JSON parsing near the top of the CRUD section**

  Add this helper just above `listSecrets` (after the `writeSecretsFile` function, around line 115):
  ```ts
  function parseImportedSecrets(content: string): Record<string, string> {
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('Selected file is not valid JSON')
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Import file must contain a JSON object, not an array or primitive')
    }
    return parsed as Record<string, string>
  }
  ```

- [ ] **Step 2: Replace `JSON.parse(content)` in `importSecrets()`**

  Change (around line 173):
  ```ts
  const content = await readFile(filePath, 'utf-8')
  const incoming = JSON.parse(content)
  ```
  To:
  ```ts
  const content = await readFile(filePath, 'utf-8')
  const incoming = parseImportedSecrets(content)
  ```

- [ ] **Step 3: Replace `JSON.parse(content)` in `importSecretsOverwrite()`**

  Change (around line 204):
  ```ts
  const content = await readFile(filePath, 'utf-8')
  const incoming = JSON.parse(content)
  ```
  To:
  ```ts
  const content = await readFile(filePath, 'utf-8')
  const incoming = parseImportedSecrets(content)
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 5: Manual verification**

  ```bash
  pnpm dev
  ```
  1. Create a file `bad.json` with content `not json at all`
  2. Open a project, click Import → Import (Merge), select `bad.json`
  3. Expected: toast error "Selected file is not valid JSON" (not a raw SyntaxError)
  4. Create a file `array.json` with content `["a", "b"]`
  5. Import it
  6. Expected: toast error "Import file must contain a JSON object..."

- [ ] **Step 6: Commit**

  ```bash
  git add src/main/secrets-service.ts
  git commit -m "fix: validate imported JSON shape and wrap parse errors with clear messages"
  ```

---

### Task 3: Fix ENOENT detection in `initUserSecrets` to use `error.code`

**Problem:** `error.message.includes('ENOENT')` checks an unstable string. Node.js guarantees `error.code === 'ENOENT'` as the canonical way to detect "executable not found".

**Files:**
- Modify: `src/main/secrets-service.ts` (the `initUserSecrets` function, around line 247)

- [ ] **Step 1: Locate the ENOENT check in `initUserSecrets`**

  Current code:
  ```ts
  execFile(
    'dotnet',
    ['user-secrets', 'init', '--project', csprojPath],
    (error, _stdout, stderr) => {
      if (error) {
        if (error.message.includes('ENOENT')) {
          reject(
            new Error(
              'dotnet SDK not found. Please install .NET SDK to initialize user secrets.'
            )
          )
        } else {
          reject(new Error(stderr || error.message))
        }
        return
      }
      // ...
    }
  )
  ```

- [ ] **Step 2: Replace `error.message.includes('ENOENT')` with `error.code`**

  Change the check to:
  ```ts
  execFile(
    'dotnet',
    ['user-secrets', 'init', '--project', csprojPath],
    (error, _stdout, stderr) => {
      if (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              'dotnet SDK not found. Please install .NET SDK to initialize user secrets.'
            )
          )
        } else {
          reject(new Error(stderr || error.message))
        }
        return
      }
      // ...
    }
  )
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/main/secrets-service.ts
  git commit -m "fix: use error.code for ENOENT detection in initUserSecrets"
  ```

---

### Task 4: Eliminate triple .csproj parsing in `setSecret` and `deleteSecret`

**Problem:** Both `setSecret` and `deleteSecret` call `parseUserSecretsId()` once directly (to get backup path), then `readSecretsFile()` calls it again internally, and `writeSecretsFile()` calls it a third time. This creates a TOCTOU window where a modified .csproj between calls could mismatch backup and write targets.

**Files:**
- Modify: `src/main/secrets-service.ts` (the `readSecretsFile`, `writeSecretsFile`, `setSecret`, `deleteSecret` functions)

- [ ] **Step 1: Add an optional `userSecretsId` parameter to `readSecretsFile`**

  Change:
  ```ts
  async function readSecretsFile(csprojPath: string): Promise<Record<string, string>> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')
    // ...
  }
  ```
  To:
  ```ts
  async function readSecretsFile(
    csprojPath: string,
    userSecretsId?: string
  ): Promise<Record<string, string>> {
    const id = userSecretsId ?? (await parseUserSecretsId(csprojPath))
    if (!id) throw new Error('UserSecretsId not found in .csproj')

    const secretsPath = resolveSecretsPath(id)
    if (!existsSync(secretsPath)) return {}

    let content = await readFile(secretsPath, 'utf-8')
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1)
    }
    if (!content.trim()) return {}

    try {
      return JSON.parse(content)
    } catch (error: any) {
      throw new Error(`Invalid JSON in secrets.json: ${secretsPath} - ${error.message}`)
    }
  }
  ```

- [ ] **Step 2: Add an optional `userSecretsId` parameter to `writeSecretsFile`**

  Change:
  ```ts
  async function writeSecretsFile(
    csprojPath: string,
    secrets: Record<string, string>
  ): Promise<void> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

    const secretsDir = resolveSecretsDir(userSecretsId)
    const secretsPath = resolveSecretsPath(userSecretsId)
    // ...
  }
  ```
  To:
  ```ts
  async function writeSecretsFile(
    csprojPath: string,
    secrets: Record<string, string>,
    userSecretsId?: string
  ): Promise<void> {
    const id = userSecretsId ?? (await parseUserSecretsId(csprojPath))
    if (!id) throw new Error('UserSecretsId not found in .csproj')

    const secretsDir = resolveSecretsDir(id)
    const secretsPath = resolveSecretsPath(id)

    if (!existsSync(secretsDir)) {
      await mkdir(secretsDir, { recursive: true })
    }

    await writeFile(secretsPath, JSON.stringify(secrets, null, 2), 'utf-8')
  }
  ```

- [ ] **Step 3: Refactor `setSecret` to parse once and pass id down**

  Change:
  ```ts
  export async function setSecret(
    csprojPath: string,
    key: string,
    value: string
  ): Promise<{ success: boolean }> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

    const secretsPath = resolveSecretsPath(userSecretsId)
    if (existsSync(secretsPath)) {
      await backupSecrets(secretsPath)
    }

    const secrets = await readSecretsFile(csprojPath)
    secrets[key] = value
    await writeSecretsFile(csprojPath, secrets)
    return { success: true }
  }
  ```
  To:
  ```ts
  export async function setSecret(
    csprojPath: string,
    key: string,
    value: string
  ): Promise<{ success: boolean }> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

    const secretsPath = resolveSecretsPath(userSecretsId)
    if (existsSync(secretsPath)) {
      await backupSecrets(secretsPath)
    }

    const secrets = await readSecretsFile(csprojPath, userSecretsId)
    secrets[key] = value
    await writeSecretsFile(csprojPath, secrets, userSecretsId)
    return { success: true }
  }
  ```

- [ ] **Step 4: Refactor `deleteSecret` to parse once and pass id down**

  Change:
  ```ts
  export async function deleteSecret(
    csprojPath: string,
    key: string
  ): Promise<{ success: boolean }> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

    const secretsPath = resolveSecretsPath(userSecretsId)
    if (existsSync(secretsPath)) {
      await backupSecrets(secretsPath)
    }

    const secrets = await readSecretsFile(csprojPath)
    delete secrets[key]
    await writeSecretsFile(csprojPath, secrets)
    return { success: true }
  }
  ```
  To:
  ```ts
  export async function deleteSecret(
    csprojPath: string,
    key: string
  ): Promise<{ success: boolean }> {
    const userSecretsId = await parseUserSecretsId(csprojPath)
    if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

    const secretsPath = resolveSecretsPath(userSecretsId)
    if (existsSync(secretsPath)) {
      await backupSecrets(secretsPath)
    }

    const secrets = await readSecretsFile(csprojPath, userSecretsId)
    delete secrets[key]
    await writeSecretsFile(csprojPath, secrets, userSecretsId)
    return { success: true }
  }
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 6: Manual verification**

  ```bash
  pnpm dev
  ```
  1. Open a project with secrets
  2. Add a new secret → verify it appears in the table
  3. Edit the secret value → verify value updates
  4. Delete the secret → verify it disappears
  5. Check `%APPDATA%\Microsoft\UserSecrets\{id}\` on Windows — backup files should exist

- [ ] **Step 7: Commit**

  ```bash
  git add src/main/secrets-service.ts
  git commit -m "fix: parse .csproj once per operation in setSecret/deleteSecret"
  ```

---

### Task 5: Remove `sandbox: false` from BrowserWindow configuration

**Problem:** `sandbox: false` disables a significant Electron security layer with no benefit — the preload script only uses `contextBridge` and `ipcRenderer`, which work correctly under sandbox mode. `contextIsolation: true` alone is weaker without sandboxing.

**Files:**
- Modify: `src/main/index.ts` (the `webPreferences` block inside `createWindow`)

- [ ] **Step 1: Remove the `sandbox: false` line**

  Current `webPreferences`:
  ```ts
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  }
  ```

  Change to:
  ```ts
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
  ```

- [ ] **Step 2: Verify the app still starts (sandbox mode is compatible with this preload)**

  ```bash
  pnpm dev
  ```
  Expected: Electron window opens normally. Open a project, load secrets, add/edit/delete — all IPC calls should work as before.

- [ ] **Step 3: Commit**

  ```bash
  git add src/main/index.ts
  git commit -m "fix: remove sandbox: false to restore Electron security defaults"
  ```

---

### Task 6: Reset `MaskedValue` visible state when secret value changes

**Problem:** `MaskedValue` stores `visible` in local `useState`. When a secret is edited, React reuses the same component instance (same `key` prop = same key name), so `visible: true` persists after the value changes. The updated secret value remains revealed in plaintext without user action.

**Files:**
- Modify: `src/renderer/src/components/SecretsTable.tsx` (the `MaskedValue` component, lines 31-76)

- [ ] **Step 1: Add a `useEffect` import if not already present**

  The file already imports `useState` and `useCallback` from React. Add `useEffect`:
  ```ts
  import React, { useState, useCallback, useEffect } from 'react'
  ```

- [ ] **Step 2: Add the reset effect inside `MaskedValue`**

  Current `MaskedValue`:
  ```ts
  function MaskedValue({ value }: { value: string }): React.ReactElement {
    const [visible, setVisible] = useState(false)
    const [copied, setCopied] = useState(false)
    // ...
  }
  ```

  Add the effect immediately after the state declarations:
  ```ts
  function MaskedValue({ value }: { value: string }): React.ReactElement {
    const [visible, setVisible] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
      setVisible(false)
    }, [value])

    // rest unchanged...
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Manual verification**

  ```bash
  pnpm dev
  ```
  1. Open a project with at least one secret
  2. Click the eye icon on a secret — value reveals in plaintext
  3. Click Edit on that same secret, change its value, save
  4. The secret row should now show the masked `•••••` view (NOT the revealed value)

- [ ] **Step 5: Commit**

  ```bash
  git add src/renderer/src/components/SecretsTable.tsx
  git commit -m "fix: reset MaskedValue visible state when secret value changes after edit"
  ```

---

## Final Verification

After all tasks are complete:

```bash
pnpm typecheck
pnpm build
```

Both should succeed with no errors. Then do a full smoke test:
- Open a `.csproj` file with user secrets
- Add, edit, and delete secrets — confirm backup files are created each time
- Toggle value visibility — confirm it re-hides after edits
- Import a valid JSON file (merge and overwrite modes)
- Import an invalid JSON file — confirm clean error toast
- Export secrets to a file
- Verify recent projects list persists between sessions
- Verify "Initialize" button works on a project without UserSecretsId
