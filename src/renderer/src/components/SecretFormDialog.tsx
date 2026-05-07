import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SecretFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  editKey: string | null
  editValue?: string
  existingKeys: string[]
  onSave: (key: string, value: string) => Promise<void>
}

export default function SecretFormDialog({
  open,
  onOpenChange,
  mode,
  editKey,
  editValue,
  existingKeys,
  onSave
}: SecretFormDialogProps): React.ReactElement {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [keyError, setKeyError] = useState('')

  // Reset form when dialog opens/changes mode
  useEffect(() => {
    if (open) {
      setKey(editKey ?? '')
      setValue(editValue ?? '')
      setKeyError('')
    }
  }, [open, editKey, editValue])

  const validateKey = useCallback(
    (k: string): string => {
      if (!k.trim()) return 'Key cannot be empty'
      if (mode === 'add' && existingKeys.includes(k.trim())) {
        return `Key "${k.trim()}" already exists — saving will overwrite it`
      }
      return ''
    },
    [mode, existingKeys]
  )

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const k = e.target.value
    setKey(k)
    setKeyError(validateKey(k))
  }

  const handleSave = async (): Promise<void> => {
    const err = validateKey(key)
    if (err && !err.includes('overwrite')) {
      setKeyError(err)
      return
    }
    setSaving(true)
    try {
      await onSave(key.trim(), value)
      onOpenChange(false)
    } catch {
      // Error is shown by parent via toast
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      void handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-slate-900 border border-white/10 text-white sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'add' ? 'Add Secret' : 'Edit Secret'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            {mode === 'add'
              ? 'Add a new key-value pair to your secrets.'
              : 'Update the value for this secret key.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Key */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="secret-key" className="text-slate-300 text-sm font-medium">
              Key
            </Label>
            <Input
              id="secret-key"
              value={key}
              onChange={handleKeyChange}
              placeholder="ConnectionStrings:Default"
              readOnly={mode === 'edit'}
              autoFocus={mode === 'add'}
              className={`bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 font-mono text-sm
                focus:border-indigo-500/50 focus:ring-indigo-500/20
                ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}
                ${keyError && keyError.includes('overwrite') ? 'border-amber-500/50' : ''}
                ${keyError && !keyError.includes('overwrite') ? 'border-red-500/50' : ''}
              `}
            />
            {keyError && (
              <p
                className={`text-xs ${
                  keyError.includes('overwrite') ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {keyError}
              </p>
            )}
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="secret-value" className="text-slate-300 text-sm font-medium">
              Value
            </Label>
            <Textarea
              id="secret-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter secret value…"
              autoFocus={mode === 'edit'}
              rows={4}
              className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 font-mono text-sm
                focus:border-indigo-500/50 focus:ring-indigo-500/20 resize-none"
            />
            <p className="text-xs text-slate-600">Press Ctrl+Enter to save</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            id="cancel-secret-btn"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            id="save-secret-btn"
            onClick={handleSave}
            disabled={saving || !key.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
