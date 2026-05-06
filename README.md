# Manage User Secrets

Manage User Secrets is a cross-platform Electron desktop application designed to provide a modern, fast, and easy-to-use graphical interface for managing .NET `user-secrets`. 

By reading and writing to the `secrets.json` files directly based on the `UserSecretsId` in your `.csproj` files, it removes the need to use the `dotnet user-secrets` CLI tool for day-to-day CRUD operations. This ensures a faster workflow without requiring the .NET SDK for basic secret management.

## Features

- **Direct File Access**: Reads and writes directly to `secrets.json` bypassing CLI overhead.
- **Cross-Platform**: Works seamlessly across Windows, macOS, and Linux.
- **Auto-Backup**: Automatically creates a timestamped `.bak` file before any modification (set, delete, import). Retains the 10 most recent backups.
- **Import / Export**: Easily share or backup secrets by exporting them to JSON. Import secrets in either "Merge" or "Overwrite" modes.
- **Value Masking**: Hide sensitive secret values from view to prevent shoulder surfing. Click to reveal.
- **Copy to Clipboard**: One-click copying of secret values.
- **Recent Projects**: Automatically remembers recently opened `.csproj` projects for quick access.
- **Initialization Support**: If a project doesn't have a `UserSecretsId` configured, easily initialize it with the click of a button (requires the `dotnet` CLI).

## Prerequisites

- **Node.js**: Required to run the development server or build the application.
- **.NET SDK** (Optional): Only required if you need to initialize user secrets for a brand new project that doesn't yet have a `<UserSecretsId>` in its `.csproj` file.

## Getting Started

1. Clone or download the repository.
2. Install the dependencies using pnpm:
   ```bash
   pnpm install
   ```
3. Start the development server and Electron app:
   ```bash
   pnpm dev
   ```

## How to Use

1. Launch the application.
2. On the Welcome Page, click **Open Project (.csproj)** and browse to the C# project file you want to manage.
3. The app will automatically read the `UserSecretsId` and locate the correct `secrets.json` file for your operating system.
4. From the Project Page, you can:
   - **Add Secret**: Click the "Add Secret" button or press `Ctrl+N` to define a new key-value pair.
   - **Edit Secret**: Click the pencil icon next to an existing secret to update its value.
   - **Search**: Use the search bar or press `Ctrl+F` to quickly find a specific key or value.
   - **Import/Export**: Use the Import/Export menu to manage secrets in bulk via JSON files.

## Tech Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Build Tool**: electron-vite
- **UI Components**: shadcn/ui + Tailwind CSS (v4)
- **Settings Storage**: electron-store
- **XML Parsing**: fast-xml-parser (for reading `.csproj` files)

## Building for Production

To build the application for your operating system, run the respective command:

- Windows: `pnpm run build:win`
- macOS: `pnpm run build:mac`
- Linux: `pnpm run build:linux`

The packaged application will be available in the `dist` folder.

## Useful CLI Commands

### Starting the Application
If you want to run the application from the command line after it has been built:

- **Windows (PowerShell)**: 
  ```powershell
  Start-Process "dist\win-unpacked\manage-user-secrets.exe"
  ```
- **macOS**: 
  ```bash
  open dist/mac/manage-user-secrets.app
  ```
- **Linux**: 
  ```bash
  ./dist/linux-unpacked/manage-user-secrets
  ```

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
