import React, { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import WelcomePage from './pages/WelcomePage'
import ProjectPage from './pages/ProjectPage'
import { api } from './api'

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

export default function App(): React.ReactElement {
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  const refreshRecents = useCallback(async () => {
    try {
      const recents = await api.getRecentProjects()
      setRecentProjects(recents)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshRecents()
  }, [refreshRecents])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentProject) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:new-secret'))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:focus-search'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentProject])

  const handleOpenProject = useCallback(async () => {
    try {
      const info = await api.openProject()
      if (info) {
        setCurrentProject(info)
        await refreshRecents()
        document.title = `${info.projectName} — User Secrets Manager`
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open project'
      if (!msg.toLowerCase().includes('cancel')) {
        toast.error(msg)
      }
    }
  }, [refreshRecents])

  const handleOpenRecentProject = useCallback(
    async (projectPath: string, projectName: string) => {
      try {
        const info = await api.getProjectInfo(projectPath)
        await api.addRecentProject(projectPath, projectName)
        setCurrentProject(info)
        await refreshRecents()
        document.title = `${info.projectName} — User Secrets Manager`
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to open project'
        toast.error(msg)
      }
    },
    [refreshRecents]
  )

  const handleCloseProject = useCallback(() => {
    setCurrentProject(null)
    document.title = 'User Secrets Manager'
  }, [])

  const handleProjectUpdated = useCallback((updated: Partial<ProjectInfo>) => {
    setCurrentProject((prev) => (prev ? { ...prev, ...updated } : prev))
  }, [])

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans antialiased">
      <Toaster position="bottom-right" theme="dark" richColors />
      {currentProject ? (
        <ProjectPage
          project={currentProject}
          onClose={handleCloseProject}
          onProjectUpdated={handleProjectUpdated}
        />
      ) : (
        <WelcomePage
          recentProjects={recentProjects}
          onOpenProject={handleOpenProject}
          onOpenRecentProject={handleOpenRecentProject}
        />
      )}
    </div>
  )
}
