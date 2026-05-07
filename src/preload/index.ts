import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  openProject: () => ipcRenderer.invoke('secrets:open-project'),
  listSecrets: (projectPath: string) => ipcRenderer.invoke('secrets:list', projectPath),
  setSecret: (projectPath: string, key: string, value: string) =>
    ipcRenderer.invoke('secrets:set', { projectPath, key, value }),
  deleteSecret: (projectPath: string, key: string) =>
    ipcRenderer.invoke('secrets:delete', { projectPath, key }),
  importSecrets: (projectPath: string) => ipcRenderer.invoke('secrets:import', projectPath),
  importSecretsOverwrite: (projectPath: string) =>
    ipcRenderer.invoke('secrets:import-overwrite', projectPath),
  exportSecrets: (projectPath: string) => ipcRenderer.invoke('secrets:export', projectPath),
  initUserSecrets: (projectPath: string) => ipcRenderer.invoke('secrets:init', projectPath),
  getProjectInfo: (projectPath: string) =>
    ipcRenderer.invoke('secrets:get-project-info', projectPath),
  getRecentProjects: () => ipcRenderer.invoke('secrets:recent-projects'),
  addRecentProject: (projectPath: string, projectName: string) =>
    ipcRenderer.invoke('secrets:add-recent', { projectPath, projectName })
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore -- contextIsolation disabled, exposing API directly to window
  window.electronAPI = electronAPI
}
