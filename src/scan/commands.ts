import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parse as parseToml } from 'smol-toml'
import { firstHeading, parseFrontmatter, str } from '../util/frontmatter.js'
import { HOME, listFiles, tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { CommandEntry, PluginEntry, Scope } from './types.js'

function read(dir: string, file: string, scope: Scope, label: string, plugin?: string): CommandEntry | undefined {
  const path = join(dir, file)
  let text = ''
  try { text = readFileSync(path, 'utf8') } catch { return undefined }

  if (file.endsWith('.toml')) {
    try {
      const data = parseToml(text) as Record<string, unknown>
      return {
        name: basename(file, '.toml'),
        description: typeof data.description === 'string' ? data.description : '',
        path, scope, label, format: 'toml', plugin,
      }
    } catch { return undefined }
  }

  const { data, body } = parseFrontmatter(text)
  return {
    name: basename(file, '.md'),
    description: str(data, 'description') ?? firstHeading(body) ?? '',
    argumentHint: str(data, 'argument-hint'),
    path, scope, label, format: 'md', plugin,
  }
}

function collect(dir: string, scope: Scope, label: string, ctx: ScanContext, plugin?: string): CommandEntry[] {
  ctx.track(dir)
  return listFiles(dir, ['.md', '.toml'])
    .filter((f) => !f.endsWith('.tmpl'))
    .map((f) => read(dir, f, scope, label, plugin))
    .filter((c): c is CommandEntry => Boolean(c))
}

export function scanCommands(ctx: ScanContext, plugins: PluginEntry[]): CommandEntry[] {
  const out: CommandEntry[] = []
  out.push(...collect(join(HOME, '.claude', 'commands'), 'user', 'user', ctx))
  for (const dir of [...ctx.dirs].reverse()) {
    if (dir === HOME) continue
    out.push(...collect(join(dir, '.claude', 'commands'), ctx.scopeOf.get(dir) ?? 'ancestor', ctx.labelOf.get(dir) ?? tilde(dir), ctx))
  }
  for (const p of plugins) {
    if (!p.enabled || !p.installed) continue
    out.push(...collect(join(p.installPath, 'commands'), 'plugin', p.name, ctx, p.name))
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}
