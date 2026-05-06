import React, { useState } from 'react'
import { toast } from 'sonner'
import { Upload, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { api } from '../api'

interface ImportExportPanelProps {
  projectPath: string
  onImported: () => void
}

export default function ImportExportPanel({
  projectPath,
  onImported
}: ImportExportPanelProps): React.ReactElement {
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleImportMerge = async (): Promise<void> => {
    setImporting(true)
    try {
      const result = await api.importSecrets(projectPath)
      if (result) {
        toast.success(`Merged ${result.merged} secret${result.merged !== 1 ? 's' : ''}`)
        onImported()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleImportOverwrite = async (): Promise<void> => {
    setOverwriteDialogOpen(false)
    setImporting(true)
    try {
      const result = await api.importSecretsOverwrite(projectPath)
      if (result) {
        toast.success(`Overwritten with ${result.merged} secret${result.merged !== 1 ? 's' : ''}`)
        onImported()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const result = await api.exportSecrets(projectPath)
      if (result) {
        toast.success(`Exported to ${result.filePath}`)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id="import-export-menu-btn"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/5 h-9 gap-1"
            disabled={importing || exporting}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import / Export</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-slate-900 border border-white/10 text-slate-200"
        >
          <DropdownMenuItem
            id="import-merge-btn"
            onClick={handleImportMerge}
            className="gap-2 hover:bg-white/5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            Import (Merge)
          </DropdownMenuItem>
          <DropdownMenuItem
            id="import-overwrite-btn"
            onClick={() => setOverwriteDialogOpen(true)}
            className="gap-2 hover:bg-white/5 cursor-pointer text-amber-400 hover:text-amber-300"
          >
            <Upload className="w-4 h-4" />
            Import (Overwrite)
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            id="export-btn"
            onClick={handleExport}
            className="gap-2 hover:bg-white/5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Overwrite Confirm Dialog */}
      <AlertDialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite All Secrets?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will <strong className="text-amber-400">replace all existing secrets</strong>{' '}
              with the contents of the imported file. A backup will be created automatically before
              overwriting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              id="confirm-overwrite-btn"
              onClick={handleImportOverwrite}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
