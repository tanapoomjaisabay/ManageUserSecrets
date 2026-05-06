import type { ProjectInfo, RecentProject } from '../../preload/index.d'

function hasError(val: unknown): val is { error: string } {
  return typeof val === 'object' && val !== null && 'error' in val
}

export const api = {
  async openProject(): Promise<ProjectInfo | null> {
    const result = await window.electronAPI.openProject()
    if (!result || hasError(result)) throw new Error(hasError(result) ? result.error : 'Cancelled')
    return result as ProjectInfo
  },

  async listSecrets(projectPath: string): Promise<Record<string, string>> {
    const result = await window.electronAPI.listSecrets(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as Record<string, string>
  },

  async setSecret(projectPath: string, key: string, value: string): Promise<void> {
    const result = await window.electronAPI.setSecret(projectPath, key, value)
    if (hasError(result)) throw new Error(result.error)
  },

  async deleteSecret(projectPath: string, key: string): Promise<void> {
    const result = await window.electronAPI.deleteSecret(projectPath, key)
    if (hasError(result)) throw new Error(result.error)
  },

  async importSecrets(projectPath: string): Promise<{ merged: number; mode: string } | null> {
    const result = await window.electronAPI.importSecrets(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as { merged: number; mode: string } | null
  },

  async importSecretsOverwrite(
    projectPath: string
  ): Promise<{ merged: number; mode: string } | null> {
    const result = await window.electronAPI.importSecretsOverwrite(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as { merged: number; mode: string } | null
  },

  async exportSecrets(projectPath: string): Promise<{ filePath: string } | null> {
    const result = await window.electronAPI.exportSecrets(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as { filePath: string } | null
  },

  async initUserSecrets(projectPath: string): Promise<{ userSecretsId: string }> {
    const result = await window.electronAPI.initUserSecrets(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as { userSecretsId: string }
  },

  async getProjectInfo(projectPath: string): Promise<ProjectInfo> {
    const result = await window.electronAPI.getProjectInfo(projectPath)
    if (hasError(result)) throw new Error(result.error)
    return result as ProjectInfo
  },

  async getRecentProjects(): Promise<RecentProject[]> {
    const result = await window.electronAPI.getRecentProjects()
    if (hasError(result)) throw new Error(result.error)
    return result as RecentProject[]
  },

  async addRecentProject(projectPath: string, projectName: string): Promise<void> {
    const result = await window.electronAPI.addRecentProject(projectPath, projectName)
    if (hasError(result)) throw new Error(result.error)
  }
}
