import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { execFile } from 'child_process'
import { XMLParser } from 'fast-xml-parser'
import { dialog, BrowserWindow } from 'electron'
import { backupSecrets } from './backup-service'

// --- Path Resolution ---

function resolveSecretsDir(userSecretsId: string): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'Microsoft', 'UserSecrets', userSecretsId)
  }
  return join(homedir(), '.microsoft', 'usersecrets', userSecretsId)
}

function resolveSecretsPath(userSecretsId: string): string {
  return join(resolveSecretsDir(userSecretsId), 'secrets.json')
}

// --- .csproj Parsing ---

export async function parseUserSecretsId(csprojPath: string): Promise<string | null> {
  const content = await readFile(csprojPath, 'utf-8')
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(content)

  // Handle both single and multiple PropertyGroup
  const propertyGroups = result?.Project?.PropertyGroup
  if (!propertyGroups) return null

  const groups = Array.isArray(propertyGroups) ? propertyGroups : [propertyGroups]
  for (const group of groups) {
    if (group.UserSecretsId) {
      return group.UserSecretsId
    }
  }
  return null
}

// --- Open Project Dialog ---

export interface ProjectInfo {
  projectName: string
  projectPath: string
  userSecretsId: string | null
  secretsPath: string | null
}

export async function getProjectInfo(csprojPath: string): Promise<ProjectInfo> {
  const projectName = basename(csprojPath, '.csproj')
  const userSecretsId = await parseUserSecretsId(csprojPath)
  return {
    projectName,
    projectPath: csprojPath,
    userSecretsId,
    secretsPath: userSecretsId ? resolveSecretsPath(userSecretsId) : null
  }
}

export async function openProjectDialog(): Promise<ProjectInfo | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window!, {
    title: 'Open .csproj Project',
    filters: [{ name: 'C# Project', extensions: ['csproj'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null

  return getProjectInfo(result.filePaths[0])
}

// --- CRUD Operations ---

async function readSecretsFile(csprojPath: string): Promise<Record<string, string>> {
  const userSecretsId = await parseUserSecretsId(csprojPath)
  if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

  const secretsPath = resolveSecretsPath(userSecretsId)
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

async function writeSecretsFile(
  csprojPath: string,
  secrets: Record<string, string>
): Promise<void> {
  const userSecretsId = await parseUserSecretsId(csprojPath)
  if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

  const secretsDir = resolveSecretsDir(userSecretsId)
  const secretsPath = resolveSecretsPath(userSecretsId)

  if (!existsSync(secretsDir)) {
    await mkdir(secretsDir, { recursive: true })
  }

  await writeFile(secretsPath, JSON.stringify(secrets, null, 2), 'utf-8')
}

export async function listSecrets(csprojPath: string): Promise<Record<string, string>> {
  return readSecretsFile(csprojPath)
}

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

// --- Import / Export ---

export async function importSecrets(
  csprojPath: string
): Promise<{ merged: number; mode: string } | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window!, {
    title: 'Import Secrets JSON',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  const incoming = JSON.parse(content)

  const userSecretsId = await parseUserSecretsId(csprojPath)
  if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

  const secretsPath = resolveSecretsPath(userSecretsId)
  if (existsSync(secretsPath)) {
    await backupSecrets(secretsPath)
  }

  const existing = await readSecretsFile(csprojPath)
  const merged = { ...existing, ...incoming }
  await writeSecretsFile(csprojPath, merged)

  return { merged: Object.keys(incoming).length, mode: 'merge' }
}

export async function importSecretsOverwrite(
  csprojPath: string
): Promise<{ merged: number; mode: string } | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window!, {
    title: 'Import Secrets JSON (Overwrite)',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  const incoming = JSON.parse(content)

  const userSecretsId = await parseUserSecretsId(csprojPath)
  if (!userSecretsId) throw new Error('UserSecretsId not found in .csproj')

  const secretsPath = resolveSecretsPath(userSecretsId)
  if (existsSync(secretsPath)) {
    await backupSecrets(secretsPath)
  }

  await writeSecretsFile(csprojPath, incoming)
  return { merged: Object.keys(incoming).length, mode: 'overwrite' }
}

export async function exportSecrets(
  csprojPath: string
): Promise<{ filePath: string } | null> {
  const window = BrowserWindow.getFocusedWindow()
  const secrets = await readSecretsFile(csprojPath)

  const result = await dialog.showSaveDialog(window!, {
    title: 'Export Secrets',
    defaultPath: 'secrets.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) return null

  await writeFile(result.filePath, JSON.stringify(secrets, null, 2), 'utf-8')
  return { filePath: result.filePath }
}

// --- Init User Secrets ---

export async function initUserSecrets(
  csprojPath: string
): Promise<{ userSecretsId: string }> {
  return new Promise((resolve, reject) => {
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

        // Re-parse to get the newly generated ID
        parseUserSecretsId(csprojPath)
          .then((id) => {
            if (id) {
              resolve({ userSecretsId: id })
            } else {
              reject(new Error('Failed to read UserSecretsId after initialization'))
            }
          })
          .catch(reject)
      }
    )
  })
}
