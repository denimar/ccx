import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Path used to re-invoke ccx in the other pane. Prefers the `ccx` on PATH so
 * the panel survives a rebuild of dist/, and falls back to this exact script.
 */
export function selfBin(): string {
  const fromPath = process.env.CCX_BIN
  if (fromPath) return fromPath
  try {
    return realpathSync(process.argv[1] ?? fileURLToPath(import.meta.url))
  } catch {
    return 'ccx'
  }
}
