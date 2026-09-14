import { execFileSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { resolveBin } from '../util/env.js'
import { selfCommand } from '../util/self.js'

function kittyBin(): string | undefined { return resolveBin('kitty') }

function rc(args: string[]): string {
  const bin = kittyBin()
  if (!bin) throw new Error('kitty executable not found')
  const base = process.env.KITTY_LISTEN_ON ? ['@', '--to', process.env.KITTY_LISTEN_ON] : ['@']
  return execFileSync(bin, [...base, ...args], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'ignore'],
  }).trim()
}

/** kitty is the preferred engine: unlike tmux it does not break the kitty
 *  graphics protocol, so images still render inside the Claude pane. */
export function kittyReady(): boolean {
  if (!process.env.KITTY_WINDOW_ID || !kittyBin()) return false
  try { rc(['ls']); return true } catch { return false }
}

export function openKitty(root: string, claudeArgs: string[]): number {
  const claude = resolveBin('claude')
  if (!claude) {
    process.stderr.write('ccx: the `claude` executable could not be found — is Claude Code installed?\n')
    return 127
  }

  const title = `ccx:${process.pid}`
  try { rc(['goto-layout', 'splits']) } catch { /* layout not enabled; launch still works */ }

  const panel = [...selfCommand(), 'panel', '--root', root]
  const launch = ['launch', '--location=vsplit', '--dont-take-focus', '--cwd', root, '--title', title, ...panel]

  let windowId = ''
  try {
    windowId = rc(['launch', '--location=vsplit', '--bias', '36', '--dont-take-focus', '--cwd', root, '--title', title, ...panel])
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

  const result = spawnSync(claude, claudeArgs, { cwd: root, stdio: 'inherit' })
  closePanel()
  return result.status ?? 0
}
