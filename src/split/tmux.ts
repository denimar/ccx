import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { selfBin } from '../util/self.js'

function has(cmd: string): boolean {
  return spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0
}

export function tmuxReady(): boolean {
  return has('tmux')
}

/** Fallback engine for non-kitty terminals and ssh sessions. */
export function openTmux(root: string, claudeArgs: string[]): number {
  const panel = `${selfBin()} panel --root ${JSON.stringify(root)}`

  if (process.env.TMUX) {
    spawnSync('tmux', ['split-window', '-h', '-l', '36%', '-c', root, panel], { stdio: 'inherit' })
    spawnSync('tmux', ['select-pane', '-L'], { stdio: 'inherit' })
    return spawnSync('claude', claudeArgs, { cwd: root, stdio: 'inherit' }).status ?? 0
  }

  const session = `ccx-${basename(root).replace(/[^A-Za-z0-9_-]/g, '-')}`
  const claude = ['claude', ...claudeArgs].map((a) => JSON.stringify(a)).join(' ')
  spawnSync('tmux', ['new-session', '-d', '-s', session, '-c', root, claude], { stdio: 'inherit' })
  spawnSync('tmux', ['split-window', '-h', '-l', '36%', '-t', session, '-c', root, panel], { stdio: 'inherit' })
  spawnSync('tmux', ['select-pane', '-t', `${session}.0`], { stdio: 'inherit' })
  return spawnSync('tmux', ['attach', '-t', session], { stdio: 'inherit' }).status ?? 0
}
