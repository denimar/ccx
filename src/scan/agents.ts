import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { firstHeading, parseFrontmatter, str } from '../util/frontmatter.js'
import { HOME, listFiles, tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { AgentEntry, PluginEntry, Scope } from './types.js'

function read(dir: string, file: string, scope: Scope, label: string, plugin?: string): AgentEntry | undefined {
  const path = join(dir, file)
  let text = ''
  try { text = readFileSync(path, 'utf8') } catch { return undefined }
  const { data, body, hasFrontmatter } = parseFrontmatter(text)
  return {
    name: str(data, 'name') ?? basename(file, '.md'),
    description: str(data, 'description') ?? firstHeading(body) ?? '',
    path,
    scope,
    label,
    model: str(data, 'model'),
    tools: str(data, 'tools'),
    mcpServers: str(data, 'mcpServers'),
    hasFrontmatter,
    plugin,
  }
}

function collect(dir: string, scope: Scope, label: string, ctx: ScanContext, plugin?: string): AgentEntry[] {
  ctx.track(dir)
  return listFiles(dir, ['.md'])
    .filter((f) => !f.endsWith('.tmpl') && !f.endsWith('.md.tmpl'))
    .map((f) => read(dir, f, scope, label, plugin))
    .filter((a): a is AgentEntry => Boolean(a))
}

export function scanAgents(ctx: ScanContext, plugins: PluginEntry[]): AgentEntry[] {
  const out: AgentEntry[] = []
  out.push(...collect(join(HOME, '.claude', 'agents'), 'user', 'user', ctx))
  for (const dir of [...ctx.dirs].reverse()) {
    if (dir === HOME) continue
    out.push(...collect(join(dir, '.claude', 'agents'), ctx.scopeOf.get(dir) ?? 'ancestor', ctx.labelOf.get(dir) ?? tilde(dir), ctx))
  }
  for (const p of plugins) {
    if (!p.enabled || !p.installed) continue
    out.push(...collect(join(p.installPath, 'agents'), 'plugin', p.name, ctx, p.name))
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}
