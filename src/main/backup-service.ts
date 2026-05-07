import { copyFile, readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

const MAX_BACKUPS = 10

export async function backupSecrets(secretsPath: string): Promise<void> {
  if (!existsSync(secretsPath)) return

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = dirname(secretsPath)
  const backupPath = join(dir, `secrets.${timestamp}.json.bak`)

  await copyFile(secretsPath, backupPath)

  // Prune old backups — keep only the latest MAX_BACKUPS
  try {
    const files = await readdir(dir)
    const backups = files.filter((f) => f.startsWith('secrets.') && f.endsWith('.json.bak')).sort()

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(0, backups.length - MAX_BACKUPS)
      await Promise.all(toDelete.map((f) => unlink(join(dir, f))))
    }
  } catch {
    // Non-critical — ignore pruning errors
  }
}
