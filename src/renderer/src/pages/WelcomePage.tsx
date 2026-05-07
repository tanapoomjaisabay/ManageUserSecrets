import React from 'react'
import { FolderOpen, Clock, ChevronRight, Shield, KeyRound, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RecentProject } from '../App'

interface WelcomePageProps {
  recentProjects: RecentProject[]
  onOpenProject: () => void
  onOpenRecentProject: (projectPath: string, projectName: string) => void
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function WelcomePage({
  recentProjects,
  onOpenProject,
  onOpenRecentProject
}: WelcomePageProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
          <KeyRound className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-sm font-semibold text-white/80 tracking-wide">
          User Secrets Manager
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 shadow-lg shadow-indigo-500/10">
            <Shield className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Manage User Secrets</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            View, edit, and manage your{' '}
            <code className="text-indigo-400 font-mono text-sm bg-indigo-500/10 px-1.5 py-0.5 rounded">
              dotnet user-secrets
            </code>{' '}
            directly — no CLI required.
          </p>
        </div>

        {/* Open Project CTA */}
        <Button
          id="open-project-btn"
          size="lg"
          onClick={onOpenProject}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 px-8 h-12 text-base font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-indigo-500/30 hover:scale-[1.02] mb-10"
        >
          <FolderOpen className="w-5 h-5" />
          Open Project (.csproj)
        </Button>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            'CRUD Secrets',
            'Auto Backup',
            'Import / Export',
            'Value Masking',
            'Recent Projects'
          ].map((feat) => (
            <Badge
              key={feat}
              variant="secondary"
              className="bg-white/5 text-slate-400 border-white/10 text-xs"
            >
              {feat}
            </Badge>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Recent Projects
            </span>
          </div>

          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-white/10 text-slate-600">
              <FileJson className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm">No recent projects yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5 bg-white/[0.02]">
              {recentProjects.map((project) => (
                <button
                  key={project.projectPath}
                  id={`recent-${project.projectName.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => onOpenRecentProject(project.projectPath, project.projectName)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors duration-150 group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <FileJson className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {project.projectName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{project.projectPath}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
                      {formatRelativeTime(project.lastOpened)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
