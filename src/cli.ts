import { cmdDoctor } from './commands/doctor.js'
import { ensurePath } from './util/env.js'
import { cmdHint } from './commands/hint.js'
import { cmdOpen } from './commands/open.js'
import { cmdPanel } from './commands/panel.js'
import { cmdPick } from './commands/pick.js'
import { cmdScan } from './commands/scan.js'
import { detectEngine } from './split/index.js'

const VERSION = '0.1.0'

const HELP = `
  ccx — live Claude Code infra HUD

  usage
    ccx [claude args…]      split: Claude Code left, infra HUD right
    ccx panel [--root DIR]  run only the HUD (what the right pane runs)
    ccx scan [DIR] [--json] print the report once and exit
    ccx pick                fuzzy-pick a project, then split
    ccx doctor              check the install
    ccx hint                one-line nudge for the shell hook

  flags
    --engine kitty|tmux|plain   force a split engine
    --dir DIR                   project dir (default: nearest project root)
    --json                      machine-readable scan output
    --health                    include MCP connection health in scan
    -v, --version               print version
    -h, --help                  this text

  keys inside the panel
    ↑↓ move   → expand   o open in $EDITOR   / filter   r rescan   ? help   q quit
`

export async function main(argv: string[]): Promise<number> {
  // a dock launch inherits the bare session PATH — put our own tools back on it
  ensurePath()

  const [first, ...rest] = argv

  if (first === '-h' || first === '--help') { process.stdout.write(HELP); return 0 }
  if (first === '-v' || first === '--version') { process.stdout.write(`ccx ${VERSION} (engine: ${detectEngine()})\n`); return 0 }

  switch (first) {
    case 'panel': return cmdPanel(rest)
    case 'scan': return cmdScan(rest)
    case 'pick': return cmdPick(rest)
    case 'doctor': return cmdDoctor()
    case 'hint': return cmdHint()
    default: return cmdOpen(argv)
  }
}

/**
 * Launched from a desktop entry there is no shell left behind to show an
 * error: the terminal window just disappears. Hold it open instead.
 */
async function holdIfDesktop(): Promise<void> {
  if (!process.argv.includes('--from-desktop') || !process.stdin.isTTY) return
  process.stdout.write('\n  press enter to close this window…')
  await new Promise<void>((res) => {
    process.stdin.setEncoding('utf8')
    process.stdin.resume()
    process.stdin.once('data', () => res())
  })
}

main(process.argv.slice(2))
  .then(async (code) => {
    if (code) { process.exitCode = code; await holdIfDesktop() }
  })
  .catch(async (err: unknown) => {
    process.stderr.write(`ccx: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exitCode = 1
    await holdIfDesktop()
  })
