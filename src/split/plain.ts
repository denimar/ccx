import { spawnSync } from 'node:child_process'
import { resolveBin } from '../util/env.js'
import { scan } from '../scan/index.js'
import { renderReport } from '../ui/report.js'

/** No splitter available (plain xterm, ssh, CI): print the report once,
 *  then hand the terminal to Claude Code. */
export function openPlain(root: string, claudeArgs: string[]): number {
  process.stdout.write(renderReport(scan(root), { width: process.stdout.columns || 80, compact: true }))
  process.stdout.write('\n\x1b[38;2;108;112;134m  no split engine found — enable kitty remote control or install tmux, see `ccx doctor`\x1b[0m\n\n')

  const claude = resolveBin('claude')
  if (!claude) {
    process.stderr.write('ccx: the `claude` executable could not be found — is Claude Code installed?\n')
    return 127
  }
  return spawnSync(claude, claudeArgs, { cwd: root, stdio: 'inherit' }).status ?? 0
}
