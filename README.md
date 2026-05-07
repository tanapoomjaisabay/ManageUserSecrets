# 🔐 Manage User Secrets

Manage User Secrets is a cross-platform Electron desktop application designed to provide a modern, fast, and easy-to-use graphical interface for managing .NET `user-secrets`.

By reading and writing to the `secrets.json` files directly based on the `UserSecretsId` in your `.csproj` files, it removes the need to use the `dotnet user-secrets` CLI tool for day-to-day CRUD operations. This ensures a faster workflow without requiring the .NET SDK for basic secret management.

## ✨ Features

- **Direct File Access**: Reads and writes directly to `secrets.json` bypassing CLI overhead.
- **Cross-Platform**: Works seamlessly across Windows, macOS, and Linux.
- **Auto-Backup**: Automatically creates a timestamped `.bak` file before any modification (set, delete, import). Retains the 10 most recent backups.
- **Import / Export**: Easily share or backup secrets by exporting them to JSON. Import secrets in either "Merge" or "Overwrite" modes.
- **Value Masking**: Hide sensitive secret values from view to prevent shoulder surfing. Click to reveal.
- **Copy to Clipboard**: One-click copying of secret values.
- **Recent Projects**: Automatically remembers recently opened `.csproj` projects for quick access.
- **Initialization Support**: If a project doesn't have a `UserSecretsId` configured, easily initialize it with the click of a button (requires the `dotnet` CLI).

## 🧰 Prerequisites

Install the following before cloning the repository.

- **Node.js 20 LTS or newer** — required to install dependencies, run the app, and build packages.
- **pnpm** — recommended package manager for this repository.
- **Git** — required to clone the repository (skip if you download a ZIP instead).
- **.NET SDK** _(optional)_ — only needed to initialize user secrets for a project that has no `<UserSecretsId>` yet. Normal read, write, import, export, and delete operations do not require it.

### Install pnpm

**Option 1 — Corepack (recommended)**

Corepack ships with recent Node.js versions and is the simplest way to activate pnpm.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

**Option 2 — npm global install**

```bash
npm install -g pnpm
pnpm --version
```

### Additional Requirements for Packaging

Only needed if you plan to build installable packages.

- **Windows** — no extra tools required.
- **macOS** — install Xcode Command Line Tools:

  ```bash
  xcode-select --install
  ```

- **Linux** — install platform build tools:

  **Ubuntu / Debian**

  ```bash
  sudo apt-get update && sudo apt-get install -y build-essential libxss-dev
  ```

  **Fedora / RHEL**

  ```bash
  sudo dnf install -y gcc-c++ make libXss-devel
  ```

## 🚀 Getting Started

1. Clone the repository and enter the project folder:

   ```bash
   git clone <repository-url>
   cd ManageUserSecrets
   ```

   If you downloaded the repository as a ZIP, extract it and open the extracted folder in your terminal instead.

2. Install dependencies:

   ```bash
   pnpm install
   ```

   This also runs `electron-builder install-app-deps` automatically via the `postinstall` script, so Electron's native dependencies are compiled for your current platform.

3. Start the development server and Electron app:

   ```bash
   pnpm dev
   ```

## 💻 Development Commands

| Command            | Purpose                                               |
|--------------------|-------------------------------------------------------|
| `pnpm dev`         | Start Electron + Vite with hot module replacement     |
| `pnpm typecheck`   | TypeScript check for both main and renderer processes |
| `pnpm lint`        | Run ESLint                                            |
| `pnpm build`       | Typecheck + compile without packaging                 |

> There is no test suite — `pnpm typecheck` is the primary correctness check.

## 🏗️ Building & Distribution

### Build Commands

| Command              | Result                                         |
|----------------------|------------------------------------------------|
| `pnpm build`         | Typecheck + compile only (no package)          |
| `pnpm build:unpack`  | Unpacked app for the current platform          |
| `pnpm build:win`     | Windows installer + unpacked app               |
| `pnpm build:mac`     | macOS package (requires Xcode CLI tools)       |
| `pnpm build:linux`   | Linux packages (requires platform build tools) |

The packaged output is placed in the `dist/` folder.

> `build:mac` and `build:linux` do not run `typecheck` automatically. Run `pnpm build` first if you want a pre-flight check before packaging.

### Running the Built App

After running `build:unpack` or a platform-specific build command:

**Windows (PowerShell)**

```powershell
Start-Process "dist\win-unpacked\manage-user-secrets.exe"
```

To create a Desktop shortcut:

```powershell
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Manage User Secrets.lnk")
$lnk.TargetPath = "$PWD\dist\win-unpacked\manage-user-secrets.exe"
$lnk.WorkingDirectory = "$PWD\dist\win-unpacked"
$lnk.IconLocation = "$PWD\dist\win-unpacked\manage-user-secrets.exe,0"
$lnk.Save()
Write-Host "Shortcut created on Desktop"
```

**macOS**

```bash
open dist/mac/manage-user-secrets.app
```

**Linux**

```bash
./dist/linux-unpacked/manage-user-secrets
```

## 📖 How to Use

1. Launch the application.
2. On the Welcome Page, click **Open Project (.csproj)** and browse to the C# project file you want to manage.
3. The app will automatically read the `UserSecretsId` and locate the correct `secrets.json` file for your operating system.
4. From the Project Page you can:
   - **Add Secret** — click "Add Secret" or press `Ctrl+N` to define a new key-value pair.
   - **Edit Secret** — click the pencil icon next to an existing secret to update its value.
   - **Search** — use the search bar or press `Ctrl+F` to find a specific key or value.
   - **Import / Export** — use the Import/Export menu to manage secrets in bulk via JSON files.

## 🧱 Tech Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Build Tool**: electron-vite
- **UI Components**: shadcn/ui + Tailwind CSS (v4)
- **Settings Storage**: electron-store
- **XML Parsing**: fast-xml-parser (for reading `.csproj` files)

## 🔧 Troubleshooting

**`pnpm` is not recognized**

Re-run one of the pnpm installation methods from the Prerequisites section, then open a new terminal and verify:

```bash
pnpm --version
```

**Electron dependencies look incomplete or corrupted**

Reinstall so the `postinstall` step re-runs:

```powershell
# Windows
Remove-Item -Recurse -Force node_modules
pnpm install
```

```bash
# macOS / Linux
rm -rf node_modules
pnpm install
```

**The app cannot initialize user secrets for a new project**

Make sure the .NET SDK is installed and on your PATH:

```bash
dotnet --version
```

If `dotnet` is not found, install the .NET SDK and retry the initialization flow.

**Development ports (5173 / 5174) are stuck or processes are lingering**

```powershell
# Windows
taskkill /F /IM electron.exe /T
taskkill /F /IM node.exe /T
taskkill /F /IM manage-user-secrets.exe /T
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173,5174 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```

```bash
# macOS / Linux
pkill -f electron
pkill -f node
pkill -f manage-user-secrets
lsof -ti:5173,5174 | xargs kill -9
```
