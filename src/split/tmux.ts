import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { resolveBin } from '../util/env.js'
import { selfCommandString } from '../util/self.js'

export function tmuxReady(): boolean {
  return Boolean(resolveBin('tmux'))
}

/** Fallback engine for non-kitty terminals and ssh sessions. */
export function openTmux(root: string, claudeArgs: string[]): number {
  const tmux = resolveBin('tmux')
  const claude = resolveBin('claude')
  if (!tmux) { process.stderr.write('ccx: tmux not found\n'); return 127 }
  if (!claude) {
    process.stderr.write('ccx: the `claude` executable could not be found — is Claude Code installed?\n')
    return 127
  }

  const panel = `${selfCommandString()} panel --root ${JSON.stringify(root)}`

  if (process.env.TMUX) {
    spawnSync(tmux, ['split-window', '-h', '-l', '36%', '-c', root, panel], { stdio: 'inherit' })
    spawnSync(tmux, ['select-pane', '-L'], { stdio: 'inherit' })
    return spawnSync(claude, claudeArgs, { cwd: root, stdio: 'inherit' }).status ?? 0
  }

  const session = `ccx-${basename(root).replace(/[^A-Za-z0-9_-]/g, '-')}`
  const claudeCmd = [claude, ...claudeArgs].map((a) => JSON.stringify(a)).join(' ')
  spawnSync(tmux, ['new-session', '-d', '-s', session, '-c', root, claudeCmd], { stdio: 'inherit' })
  spawnSync(tmux, ['split-window', '-h', '-l', '36%', '-t', session, '-c', root, panel], { stdio: 'inherit' })
  spawnSync(tmux, ['select-pane', '-t', `${session}.0`], { stdio: 'inherit' })
  return spawnSync(tmux, ['attach', '-t', session], { stdio: 'inherit' }).status ?? 0
}
