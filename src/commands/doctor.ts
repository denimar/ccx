import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HOME, isFile, tilde } from '../util/walk.js'
import { color, icon } from '../ui/theme.js'

const NO_COLOR = Boolean(process.env.NO_COLOR) || !process.stdout.isTTY
function hex(h: string, s: string): string {
  if (NO_COLOR) return s
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  return `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`
}

interface Check { name: string; ok: boolean | 'warn'; detail: string; fix?: string }

function has(cmd: string): boolean {
  return spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0
}

function fileContains(path: string, needle: string): boolean {
  try { return readFileSync(path, 'utf8').includes(needle) } catch { return false }
}

export async function cmdDoctor(): Promise<number> {
  const checks: Check[] = []
  const kittyConf = join(HOME, '.config', 'kitty', 'kitty.conf')
  const desktop = join(HOME, '.local', 'share', 'applications', 'ccx.desktop')

  checks.push({
    name: 'ccx on PATH',
    ok: has('ccx'),
    detail: has('ccx') ? execFileSync('sh', ['-c', 'command -v ccx'], { encoding: 'utf8' }).trim() : 'not found',
    fix: 'run install/install.sh',
  })

  checks.push({ name: 'node >= 20', ok: Number(process.versions.node.split('.')[0]) >= 20, detail: `v${process.versions.node}` })
  checks.push({ name: 'claude CLI', ok: has('claude'), detail: has('claude') ? 'found' : 'missing', fix: 'install Claude Code' })

  const inKitty = Boolean(process.env.KITTY_WINDOW_ID)
  let rcOk = false
  if (inKitty) {
    try {
      const base = process.env.KITTY_LISTEN_ON ? ['@', '--to', process.env.KITTY_LISTEN_ON, 'ls'] : ['@', 'ls']
      execFileSync('kitty', base, { stdio: ['inherit', 'ignore', 'ignore'] })
      rcOk = true
    } catch { rcOk = false }
  }
  checks.push({
    name: 'kitty remote control',
    ok: rcOk ? true : inKitty ? false : 'warn',
    detail: !inKitty ? 'not running inside kitty' : rcOk ? 'reachable' : 'kitty is running without remote control',
    fix: 'add the ccx block to kitty.conf, then fully restart kitty',
  })
  checks.push({
    name: 'kitty.conf configured',
    ok: fileContains(kittyConf, '>>> ccx >>>') ? true : 'warn',
    detail: tilde(kittyConf),
    fix: 'run install/install.sh',
  })
  checks.push({ name: 'tmux fallback', ok: has('tmux') ? true : 'warn', detail: has('tmux') ? 'available' : 'not installed (only needed outside kitty)' })
  checks.push({ name: 'desktop entry', ok: isFile(desktop) ? true : 'warn', detail: tilde(desktop), fix: 'run install/install.sh' })

  let favorites = ''
  try { favorites = execFileSync('gsettings', ['get', 'org.gnome.shell', 'favorite-apps'], { encoding: 'utf8' }) } catch { /* not gnome */ }
  checks.push({
    name: 'dock favorite',
    ok: favorites.includes('ccx.desktop') ? true : 'warn',
    detail: favorites ? (favorites.includes('ccx.desktop') ? 'pinned' : 'not pinned') : 'GNOME not detected',
    fix: 'run install/install.sh',
  })

  const zshrc = join(HOME, '.zshrc')
  const hookInstalled = fileContains(zshrc, '>>> ccx >>>') || fileContains(zshrc, 'ccx hint')
  checks.push({ name: 'shell hint hook', ok: hookInstalled ? true : 'warn', detail: hookInstalled ? tilde(zshrc) : 'not installed', fix: 'run install/install.sh' })
  checks.push({ name: '$EDITOR', ok: process.env.EDITOR || process.env.VISUAL ? true : 'warn', detail: process.env.EDITOR ?? process.env.VISUAL ?? 'unset — the o key will do nothing' })

  process.stdout.write(`\n  ${hex(color.mauve, `${icon.logo} ccx doctor`)}\n\n`)
  for (const c of checks) {
    const mark = c.ok === true ? hex(color.green, icon.good) : c.ok === 'warn' ? hex(color.yellow, icon.warn) : hex(color.red, icon.err)
    process.stdout.write(`  ${mark} ${c.name.padEnd(24)} ${hex(color.muted, c.detail)}\n`)
    if (c.ok !== true && c.fix) process.stdout.write(`     ${hex(color.subtext, `→ ${c.fix}`)}\n`)
  }
  process.stdout.write('\n')
  return checks.some((c) => c.ok === false) ? 1 : 0
}
