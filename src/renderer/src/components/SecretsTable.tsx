import React, { useState, useCallback, useEffect } from 'react'
import { Eye, EyeOff, Copy, Pencil, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface SecretsTableProps {
  secrets: [string, string][]
  loading: boolean
  search: string
  onEdit: (key: string) => void
  onDelete: (key: string) => Promise<void>
}

function MaskedValue({ value }: { value: string }): React.ReactElement {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setVisible(false)
  }, [value])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }, [value])

  return (
    <div className="flex items-center gap-2 group">
      <span
        className={`font-mono text-xs flex-1 truncate max-w-[320px] ${
          visible ? 'text-slate-200' : 'text-slate-500 tracking-widest'
        }`}
      >
        {visible ? value : '•'.repeat(Math.min(value.length, 20))}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setVisible((v) => !v)}
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title={visible ? 'Hide value' : 'Show value'}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleCopy}
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

export default function SecretsTable({
  secrets,
  loading,
  search,
  onEdit,
  onDelete
}: SecretsTableProps): React.ReactElement {
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteKey) return
    setDeleting(true)
    try {
      await onDelete(deleteKey)
    } finally {
      setDeleting(false)
      setDeleteKey(null)
    }
  }, [deleteKey, onDelete])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-white/[0.03] animate-pulse border border-white/5"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    )
  }

  if (secrets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600 rounded-xl border border-dashed border-white/8">
        {search ? (
          <>
            <p className="text-sm font-medium text-slate-500 mb-1">No results for &quot;{search}&quot;</p>
            <p className="text-xs text-slate-600">Try a different search term</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-500 mb-1">No secrets yet</p>
            <p className="text-xs text-slate-600">Click &quot;Add Secret&quot; to create your first one</p>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-white/8 overflow-hidden bg-white/[0.015]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/8 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-4 w-[45%]">
                Key
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest w-[45%]">
                Value
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-right pr-4 w-[10%]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.map(([key, value]) => (
              <TableRow
                key={key}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors group"
              >
                <TableCell className="pl-4 py-3">
                  <span className="font-mono text-xs text-indigo-300 break-all">{key}</span>
                </TableCell>
                <TableCell className="py-3">
                  <MaskedValue value={value} />
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      id={`edit-${key.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-slate-600 hover:text-slate-200 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => onEdit(key)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      id={`delete-${key.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => setDeleteKey(key)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteKey} onOpenChange={(o) => !o && setDeleteKey(null)}>
        <AlertDialogContent className="bg-slate-900 border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete{' '}
              <code className="font-mono text-indigo-400 text-sm">{deleteKey}</code>? This action
              cannot be undone (a backup will be created automatically).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              id="confirm-delete-btn"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
