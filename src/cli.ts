import { cmdDoctor } from './commands/doctor.js'
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

main(process.argv.slice(2))
  .then((code) => { if (code) process.exitCode = code })
  .catch((err: unknown) => {
    process.stderr.write(`ccx: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exitCode = 1
  })
