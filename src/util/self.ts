import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Argv used to re-invoke ccx in another pane or terminal.
 *
 * Always `[<absolute node>, <absolute cli.js>]` — never the `ccx` shim and
 * never a bare name. The panel window is created by the *kitty* process, which
 * inherits the desktop session environment rather than ccx's, so anything that
 * relied on PATH or on the `#!/usr/bin/env node` shebang would die instantly
 * and take the window with it.
 */
export function selfCommand(): string[] {
  const override = process.env.CCX_BIN
  if (override) return [override]
  let script = process.argv[1] ?? fileURLToPath(import.meta.url)
  try { script = realpathSync(script) } catch { /* keep as given */ }
  return [process.execPath, script]
}

/** The same thing as a shell-quoted string, for tmux. */
export function selfCommandString(): string {
  return selfCommand().map((a) => JSON.stringify(a)).join(' ')
}
