import { existsSync, readdirSync, statSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { HOME } from './walk.js'

/**
 * A desktop launcher does not source your shell rc, so ccx can start with the
 * bare systemd session PATH:
 *
 *   /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/snap/bin
 *
 * — which has no node, no claude and no kitty on a typical setup. Everything in
 * this file exists so that ccx behaves the same whether it was started from a
 * shell, from a .desktop file, or from a dock icon.
 */

/** Directories that commonly hold user-installed tools but miss the session PATH. */
function candidateDirs(): string[] {
  return [
    dirname(process.execPath), // the node running us, wherever it came from
    join(HOME, '.local', 'bin'),
    join(HOME, '.local', 'share', 'pnpm'),
    join(HOME, '.bun', 'bin'),
    '/usr/local/bin',
  ]
}

/** Prepend the missing directories to PATH so spawned children resolve. */
export function ensurePath(): void {
  const current = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  const missing = candidateDirs().filter((d) => !current.includes(d) && existsSync(d))
  if (missing.length) process.env.PATH = [...missing, ...current].join(delimiter)
}

function isExecutable(p: string): boolean {
  try { return statSync(p).isFile() } catch { return false }
}

/** Newest `~/.local/share/claude/versions/*`, which is what ~/.local/bin/claude points at. */
function claudeVersions(): string[] {
  const dir = join(HOME, '.local', 'share', 'claude', 'versions')
  try {
    return readdirSync(dir).sort().reverse().map((v) => join(dir, v))
  } catch { return [] }
}

const FALLBACKS: Record<string, () => string[]> = {
  node: () => [process.execPath],
  claude: () => [join(HOME, '.local', 'bin', 'claude'), ...claudeVersions()],
  kitty: () => [join(HOME, '.local', 'bin', 'kitty'), join(HOME, '.local', 'kitty.app', 'bin', 'kitty')],
  tmux: () => ['/usr/bin/tmux', '/usr/local/bin/tmux'],
}

/**
 * Absolute path to a binary: PATH first, then the places it is usually
 * installed. Returns undefined rather than letting a child fail with a bare
 * ENOENT the user cannot interpret.
 */
export function resolveBin(name: string, extra: string[] = []): string | undefined {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    const p = join(dir, name)
    if (isExecutable(p)) return p
  }
  for (const p of [...extra, ...(FALLBACKS[name]?.() ?? [])]) {
    if (isExecutable(p)) return p
  }
  return undefined
}

/** The PATH a GNOME/systemd session hands to a launched desktop entry. */
export function sessionPath(): string {
  return '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin'
}
