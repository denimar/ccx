import { execFileSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { selfBin } from '../util/self.js'

function rc(args: string[], quiet = true): string {
  const base = process.env.KITTY_LISTEN_ON ? ['@', '--to', process.env.KITTY_LISTEN_ON] : ['@']
  return execFileSync('kitty', [...base, ...args], {
    encoding: 'utf8',
    stdio: quiet ? ['inherit', 'pipe', 'ignore'] : 'inherit',
  }).trim()
}

/** kitty is the preferred engine: unlike tmux it does not break the kitty
 *  graphics protocol, so images still render inside the Claude pane. */
export function kittyReady(): boolean {
  if (!process.env.KITTY_WINDOW_ID) return false
  try { rc(['ls']); return true } catch { return false }
}

export function openKitty(root: string, claudeArgs: string[]): number {
  const title = `ccx:${process.pid}`
  try { rc(['goto-layout', 'splits']) } catch { /* layout not enabled; launch still works */ }

  const launch = ['launch', '--location=vsplit', '--dont-take-focus', '--cwd', root, '--title', title,
    selfBin(), 'panel', '--root', root]

  let windowId = ''
  try {
    windowId = rc([...launch.slice(0, 1), '--bias', '36', ...launch.slice(1)])
  } catch {
    try { windowId = rc(launch) } catch { /* fall through: run claude alone */ }
  }

  try { rc(['set-window-title', '--match', `id:${process.env.KITTY_WINDOW_ID}`, `claude · ${basename(root)}`]) } catch { /* cosmetic */ }

  const closePanel = () => {
    if (!windowId) return
    try { rc(['close-window', '--match', `id:${windowId}`]) } catch { /* already gone */ }
  }
  process.on('SIGINT', closePanel)
  process.on('SIGTERM', closePanel)

  const claude = spawnSync('claude', claudeArgs, { cwd: root, stdio: 'inherit' })
  closePanel()
  return claude.status ?? 0
}
