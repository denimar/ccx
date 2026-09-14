import { openKitty, kittyReady } from './kitty.js'
import { openTmux, tmuxReady } from './tmux.js'
import { openPlain } from './plain.js'

export type Engine = 'kitty' | 'tmux' | 'plain'

export function detectEngine(): Engine {
  if (kittyReady()) return 'kitty'
  if (tmuxReady()) return 'tmux'
  return 'plain'
}

/** Split the terminal, put the HUD on the right and Claude Code on the left. */
export function openSplit(root: string, claudeArgs: string[], forced?: Engine): number {
  const engine = forced ?? detectEngine()
  if (engine === 'kitty') return openKitty(root, claudeArgs)
  if (engine === 'tmux') return openTmux(root, claudeArgs)
  return openPlain(root, claudeArgs)
}

export { kittyReady, tmuxReady }
