import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { findProjectRoot } from '../scan/index.js'
import { HOME, isDir, isFile } from '../util/walk.js'
import { color, icon } from '../ui/theme.js'

const STATE = join(process.env.XDG_CACHE_HOME ?? join(HOME, '.cache'), 'ccx', 'seen.json')

function hex(h: string, s: string): string {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  return `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`
}

/**
 * Printed by the zsh chpwd hook. One dim line, once per project per day —
 * never launches anything on its own.
 */
export async function cmdHint(): Promise<number> {
  if (process.env.CCX_HINT === '0' || process.env.CCX_ACTIVE) return 0
  const root = findProjectRoot(process.cwd())
  const hasInfra = isDir(join(root, '.claude')) || isFile(join(root, 'CLAUDE.md')) || isFile(join(root, '.mcp.json'))
  if (!hasInfra) return 0

  let seen: Record<string, number> = {}
  try { seen = JSON.parse(readFileSync(STATE, 'utf8')) } catch { /* first run */ }
  const today = Math.floor(Date.now() / 86_400_000)
  if (seen[root] === today) return 0
  seen[root] = today
  try {
    mkdirSync(join(STATE, '..'), { recursive: true })
    writeFileSync(STATE, JSON.stringify(seen))
  } catch { /* cache is best-effort */ }

  process.stdout.write(
    `${hex(color.mauve, `  ${icon.logo} ccx`)} ${hex(color.muted, '— Claude Code infra here.')} ${hex(color.subtext, 'run')} ${hex(color.text, 'ccx')}\n`,
  )
  return 0
}
