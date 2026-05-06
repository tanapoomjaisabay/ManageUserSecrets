import { ipcMain } from 'electron'
import StoreRaw from 'electron-store'
import {
  openProjectDialog,
  getProjectInfo,
  listSecrets,
  setSecret,
  deleteSecret,
  importSecrets,
  importSecretsOverwrite,
  exportSecrets,
  initUserSecrets
} from './secrets-service'

interface RecentProject {
  projectPath: string
  projectName: string
  lastOpened: string
}

const Store = (StoreRaw as any).default || StoreRaw
const store = new Store({
  defaults: { recentProjects: [] as RecentProject[] }
})

function addRecentProject(projectPath: string, projectName: string): void {
  const projects = store.get('recentProjects', [])
  const filtered = projects.filter((p) => p.projectPath !== projectPath)
  filtered.unshift({ projectPath, projectName, lastOpened: new Date().toISOString() })
  store.set('recentProjects', filtered.slice(0, 10))
}

function wrapHandler<T>(
  fn: () => Promise<T>
): Promise<T | { error: string }> {
  return fn().catch((err: Error) => ({ error: err.message }))
}

export function registerIpcHandlers(): void {
  ipcMain.handle('secrets:open-project', () =>
    wrapHandler(async () => {
      const info = await openProjectDialog()
      if (info) {
        addRecentProject(info.projectPath, info.projectName)
      }
      return info
    })
  )

  ipcMain.handle('secrets:list', (_event, projectPath: string) =>
    wrapHandler(() => listSecrets(projectPath))
  )

  ipcMain.handle(
    'secrets:set',
    (_event, { projectPath, key, value }: { projectPath: string; key: string; value: string }) =>
      wrapHandler(() => setSecret(projectPath, key, value))
  )

  ipcMain.handle(
    'secrets:delete',
    (_event, { projectPath, key }: { projectPath: string; key: string }) =>
      wrapHandler(() => deleteSecret(projectPath, key))
  )

  ipcMain.handle('secrets:import', (_event, projectPath: string) =>
    wrapHandler(() => importSecrets(projectPath))
  )

  ipcMain.handle('secrets:import-overwrite', (_event, projectPath: string) =>
    wrapHandler(() => importSecretsOverwrite(projectPath))
  )

  ipcMain.handle('secrets:export', (_event, projectPath: string) =>
    wrapHandler(() => exportSecrets(projectPath))
  )

  ipcMain.handle('secrets:init', (_event, projectPath: string) =>
    wrapHandler(() => initUserSecrets(projectPath))
  )

  ipcMain.handle('secrets:get-project-info', (_event, projectPath: string) =>
    wrapHandler(() => getProjectInfo(projectPath))
  )

  ipcMain.handle('secrets:recent-projects', () =>
    wrapHandler(async () => store.get('recentProjects', []))
  )

  ipcMain.handle(
    'secrets:add-recent',
    (_event, { projectPath, projectName }: { projectPath: string; projectName: string }) =>
      wrapHandler(async () => {
        addRecentProject(projectPath, projectName)
        return { success: true }
      })
  )
}
