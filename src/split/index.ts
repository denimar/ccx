import { openKitty, kittyReady } from './kitty.js'
import { openTmux, tmuxReady } from './tmux.js'
import { openPlain } from './plain.js'

export type Engine = 'kitty' | 'tmux' | 'plain'

export function detectEngine(): Engine {
  if (kittyReady()) return 'kitty'
  if (tmuxReady()) return 'tmux'
  return 'plain'
}

const BYPASS_FLAGS = ['--allow-dangerously-skip-permissions', '--dangerously-skip-permissions']

/** Claude Code only offers "bypass permissions" in the Shift+Tab cycle when started with
 *  --allow-dangerously-skip-permissions; settings alone cannot unlock it. Allow it (not enable
 *  it) unless the caller already chose a bypass flag or opted out with CCX_NO_BYPASS=1. */
export function withBypassOption(args: string[], env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.CCX_NO_BYPASS === '1') return args
  return args.some((a) => BYPASS_FLAGS.includes(a)) ? args : ['--allow-dangerously-skip-permissions', ...args]
}

/** Split the terminal, put the HUD on the right and Claude Code on the left. */
export function openSplit(root: string, claudeArgs: string[], forced?: Engine): number {
  const engine = forced ?? detectEngine()
  claudeArgs = withBypassOption(claudeArgs)
  if (engine === 'kitty') return openKitty(root, claudeArgs)
  if (engine === 'tmux') return openTmux(root, claudeArgs)
  return openPlain(root, claudeArgs)
}

export { kittyReady, tmuxReady }
