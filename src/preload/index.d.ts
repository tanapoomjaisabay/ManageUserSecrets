export interface ProjectInfo {
  projectName: string
  projectPath: string
  userSecretsId: string | null
  secretsPath: string | null
}

export interface RecentProject {
  projectPath: string
  projectName: string
  lastOpened: string
}

export interface ElectronAPI {
  openProject: () => Promise<ProjectInfo | null | { error: string }>
  listSecrets: (projectPath: string) => Promise<Record<string, string> | { error: string }>
  setSecret: (
    projectPath: string,
    key: string,
    value: string
  ) => Promise<{ success: boolean } | { error: string }>
  deleteSecret: (
    projectPath: string,
    key: string
  ) => Promise<{ success: boolean } | { error: string }>
  importSecrets: (
    projectPath: string
  ) => Promise<{ merged: number; mode: string } | null | { error: string }>
  importSecretsOverwrite: (
    projectPath: string
  ) => Promise<{ merged: number; mode: string } | null | { error: string }>
  exportSecrets: (
    projectPath: string
  ) => Promise<{ filePath: string } | null | { error: string }>
  initUserSecrets: (
    projectPath: string
  ) => Promise<{ userSecretsId: string } | { error: string }>
  getRecentProjects: () => Promise<RecentProject[] | { error: string }>
  addRecentProject: (
    projectPath: string,
    projectName: string
  ) => Promise<{ success: boolean } | { error: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
