import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, RefreshCw, Search, X, AlertTriangle, KeyRound, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import SecretsTable from '../components/SecretsTable'
import SecretFormDialog from '../components/SecretFormDialog'
import ImportExportPanel from '../components/ImportExportPanel'
import { api } from '../api'
import type { ProjectInfo } from '../App'

interface ProjectPageProps {
  project: ProjectInfo
  onClose: () => void
  onProjectUpdated: (updated: Partial<ProjectInfo>) => void
}

export default function ProjectPage({
  project,
  onClose,
  onProjectUpdated
}: ProjectPageProps): React.ReactElement {
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadSecrets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listSecrets(project.projectPath)
      setSecrets(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load secrets')
    } finally {
      setLoading(false)
    }
  }, [project.projectPath])

  useEffect(() => {
    loadSecrets()
  }, [loadSecrets])

  // Keyboard shortcuts
  useEffect(() => {
    const onNewSecret = (): void => {
      setEditKey(null)
      setDialogOpen(true)
    }
    const onFocusSearch = (): void => searchRef.current?.focus()

    window.addEventListener('shortcut:new-secret', onNewSecret)
    window.addEventListener('shortcut:focus-search', onFocusSearch)
    return () => {
      window.removeEventListener('shortcut:new-secret', onNewSecret)
      window.removeEventListener('shortcut:focus-search', onFocusSearch)
    }
  }, [])

  const handleSaveSecret = useCallback(
    async (key: string, value: string) => {
      try {
        await api.setSecret(project.projectPath, key, value)
        await loadSecrets()
        toast.success(editKey ? 'Secret updated' : 'Secret added')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save secret')
        throw err
      }
    },
    [project.projectPath, editKey, loadSecrets]
  )

  const handleDeleteSecret = useCallback(
    async (key: string) => {
      try {
        await api.deleteSecret(project.projectPath, key)
        await loadSecrets()
        toast.success('Secret deleted')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete secret')
      }
    },
    [project.projectPath, loadSecrets]
  )

  const handleInitialize = useCallback(async () => {
    setInitializing(true)
    try {
      const result = await api.initUserSecrets(project.projectPath)
      onProjectUpdated({ userSecretsId: result.userSecretsId })
      await loadSecrets()
      toast.success('User secrets initialized successfully')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to initialize user secrets')
    } finally {
      setInitializing(false)
    }
  }, [project.projectPath, onProjectUpdated, loadSecrets])

  const filteredSecrets = Object.entries(secrets).filter(
    ([k, v]) =>
      k.toLowerCase().includes(search.toLowerCase()) ||
      v.toLowerCase().includes(search.toLowerCase())
  )

  const totalCount = Object.keys(secrets).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-slate-950/60 backdrop-blur">
        <button
          id="back-btn"
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <KeyRound className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{project.projectName}</span>
          <span className="text-xs text-slate-500 truncate hidden sm:block">
            {project.projectPath}
          </span>
        </div>

        {project.userSecretsId && (
          <Badge
            variant="secondary"
            className="hidden md:flex bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs font-mono truncate max-w-[200px]"
            title={project.userSecretsId}
          >
            {project.userSecretsId.slice(0, 8)}…
          </Badge>
        )}

        <Badge variant="secondary" className="bg-white/5 text-slate-400 border-white/10 text-xs">
          {totalCount} {totalCount === 1 ? 'secret' : 'secrets'}
        </Badge>
      </header>

      {/* No UserSecretsId banner */}
      {!project.userSecretsId && !loading && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">No UserSecretsId found</span>
            <span className="text-amber-300/70 ml-1">
              — This project has not been initialized for user secrets.
            </span>
          </div>
          <Button
            id="initialize-btn"
            size="sm"
            onClick={handleInitialize}
            disabled={initializing}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold flex-shrink-0"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            {initializing ? 'Initializing…' : 'Initialize'}
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <Input
            ref={searchRef}
            id="search-input"
            placeholder="Search keys or values…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
            className="pl-9 pr-8 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            id="refresh-btn"
            variant="ghost"
            size="sm"
            onClick={loadSecrets}
            disabled={loading}
            className="text-slate-400 hover:text-white hover:bg-white/5 h-9"
            title="Refresh (F5)"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <ImportExportPanel projectPath={project.projectPath} onImported={loadSecrets} />

          <Button
            id="add-secret-btn"
            size="sm"
            onClick={() => {
              setEditKey(null)
              setDialogOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 h-9 font-semibold"
            title="Add Secret (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <SecretsTable
          secrets={filteredSecrets}
          loading={loading}
          search={search}
          onEdit={(key) => {
            setEditKey(key)
            setDialogOpen(true)
          }}
          onDelete={handleDeleteSecret}
        />
      </div>

      {/* Add/Edit Dialog */}
      <SecretFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editKey ? 'edit' : 'add'}
        editKey={editKey}
        editValue={editKey ? secrets[editKey] : undefined}
        existingKeys={Object.keys(secrets)}
        onSave={handleSaveSecret}
      />
    </div>
  )
}
