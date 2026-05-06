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

- **Node.js**: Recommended version is Node.js 20 LTS or newer. Node.js is required to install dependencies, run the development app, and build packages.
- **pnpm**: Recommended package manager for this repository.
- **Git**: Required if you want to clone the repository instead of downloading a ZIP.
- **.NET SDK** (Optional): Only required if you need to initialize user secrets for a project that does not already have a `<UserSecretsId>` in its `.csproj` file. Normal secret read, update, import, export, and delete operations do not require the .NET SDK.

### Install pnpm

You can install pnpm in either of the following ways.

**Option 1: Use Corepack (recommended)**

Corepack ships with recent Node.js versions and is the simplest way to activate pnpm.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

**Option 2: Install pnpm globally with npm**

```bash
npm install -g pnpm
pnpm --version
```

### Additional Requirements for Packaging

These tools are only needed if you want to build installable packages for a platform.

- **Windows**: No additional build tools are required beyond Node.js and pnpm.
- **macOS**: Install Xcode Command Line Tools before running `pnpm run build:mac`.

  ```bash
  xcode-select --install
  ```

- **Linux**: Install the platform build tools before running `pnpm run build:linux`.

  **Ubuntu / Debian**

  ```bash
  sudo apt-get update
  sudo apt-get install -y build-essential libxss-dev
  ```

  **Fedora / RHEL**

  ```bash
  sudo dnf install -y gcc-c++ make libXss-devel
  ```

## 🚀 Getting Started

1. Clone the repository and move into the project folder:

  ```bash
  git clone <repository-url>
  cd ManageUserSecrets
  ```

  If you downloaded the repository as a ZIP, extract it first and open the extracted folder in your terminal.

2. Install pnpm if it is not already available on your machine:

  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

3. Install the JavaScript and Electron dependencies:

   ```bash
   pnpm install
   ```

    During installation, the repository runs `electron-builder install-app-deps` automatically through the `postinstall` script so that Electron packaging dependencies are prepared for your current platform.

4. Start the development server and Electron app:

   ```bash
   pnpm dev
   ```

5. Optional quality checks before you make changes:

    ```bash
    pnpm run lint
    pnpm run typecheck
    ```

## 💻 Local Development Notes

- Use `pnpm dev` for day-to-day development.
- Use `pnpm start` to preview the built application.
- Use `pnpm run build` to run TypeScript checks and produce the compiled app without packaging it.

## 📖 How to Use

1. Launch the application.
2. On the Welcome Page, click **Open Project (.csproj)** and browse to the C# project file you want to manage.
3. The app will automatically read the `UserSecretsId` and locate the correct `secrets.json` file for your operating system.
4. From the Project Page, you can:
   - **Add Secret**: Click the "Add Secret" button or press `Ctrl+N` to define a new key-value pair.
   - **Edit Secret**: Click the pencil icon next to an existing secret to update its value.
   - **Search**: Use the search bar or press `Ctrl+F` to quickly find a specific key or value.
   - **Import/Export**: Use the Import/Export menu to manage secrets in bulk via JSON files.

## 🧱 Tech Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Build Tool**: electron-vite
- **UI Components**: shadcn/ui + Tailwind CSS (v4)
- **Settings Storage**: electron-store
- **XML Parsing**: fast-xml-parser (for reading `.csproj` files)

## 🏗️ Building for Production

Use the following commands depending on the result you need:

- **Compile and type-check only**:

  ```bash
  pnpm run build
  ```

- **Build an unpacked app for the current platform**:

  ```bash
  pnpm run build:unpack
  ```

- **Create a Windows installer and unpacked app**:

  ```bash
  pnpm run build:win
  ```

- **Create a macOS package**:

  ```bash
  pnpm run build:mac
  ```

- **Create Linux packages**:

  ```bash
  pnpm run build:linux
  ```

The packaged application will be available in the `dist` folder.

`build:mac` and `build:linux` follow the repository scripts exactly and do not run `typecheck` automatically first. If you want a pre-flight validation before packaging on those platforms, run `pnpm run build` before the packaging command.

## ⌨️ Useful CLI Commands

### Starting the Application
If you want to run the application from the command line after it has been built:

- **Windows (PowerShell)**: 
  ```powershell
  Start-Process "dist\win-unpacked\manage-user-secrets.exe"
  ```

  **Windows (Desktop Icon)**: 
  ```powershell
  $ws = New-Object -ComObject WScript.Shell ; $lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Manage User Secrets.lnk") ; $lnk.TargetPath = "$PWD\dist\win-unpacked\manage-user-secrets.exe" ; $lnk.WorkingDirectory = "$PWD\dist\win-unpacked" ; $lnk.IconLocation = "$PWD\dist\win-unpacked\manage-user-secrets.exe,0" ; $lnk.Save() ; Write-Host "Shortcut created on Desktop"
  ```
- **macOS**: 
  ```bash
  open dist/mac/manage-user-secrets.app
  ```
- **Linux**: 
  ```bash
  ./dist/linux-unpacked/manage-user-secrets
  ```

### Troubleshooting Setup and Runtime

- **`pnpm` is not recognized**:

  Re-run one of the pnpm installation methods from the prerequisites section, then open a new terminal and check:

  ```bash
  pnpm --version
  ```

- **Electron dependencies look incomplete or corrupted**:

  Reinstall dependencies so the `postinstall` step runs again.

  **Windows (PowerShell)**

  ```powershell
  Remove-Item -Recurse -Force node_modules
  pnpm install
  ```

  **macOS / Linux**

  ```bash
  rm -rf node_modules
  pnpm install
  ```

- **The application cannot initialize user secrets for a new project**:

  Make sure the .NET SDK is installed and available in your terminal.

  ```bash
  dotnet --version
  ```

  If `dotnet` is not found, install the .NET SDK and try the initialization flow again.

### Stopping All Processes & Clearing Ports
If the application crashes, leaves background processes, or locks the development ports (5173/5174), you can forcefully kill them using the following commands:

- **Windows (PowerShell)**:
  ```powershell
  taskkill /F /IM electron.exe /T
  taskkill /F /IM node.exe /T
  taskkill /F /IM manage-user-secrets.exe /T
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173, 5174 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

- **macOS / Linux**:
  ```bash
  pkill -f electron
  pkill -f node
  pkill -f manage-user-secrets
  lsof -ti:5173,5174 | xargs kill -9
  ```
