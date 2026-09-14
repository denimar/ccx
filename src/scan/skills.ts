import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { firstHeading, parseFrontmatter, str } from '../util/frontmatter.js'
import { HOME, isFile, linkInfo, listDirs, tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { PluginEntry, Scope, SkillEntry } from './types.js'

/** Tighter scope wins on a name collision — project > workspace > harness > user. */
const RANK: Record<Scope, number> = { user: 0, plugin: 1, ancestor: 2, harness: 3, workspace: 4, project: 5 }

function readSkill(dir: string, name: string, scope: Scope, label: string, plugin?: string): SkillEntry | undefined {
  const path = join(dir, name)
  const md = join(path, 'SKILL.md')
  const link = linkInfo(path)
  if (link.broken) {
    return {
      name, path, realPath: link.realPath, scope, label,
      origin: 'link', hops: link.hops, broken: true, winner: false, shadows: [],
      description: 'broken symlink — target does not exist',
      disableModelInvocation: false, plugin,
    }
  }
  if (!isFile(md)) return undefined
  let text = ''
  try { text = readFileSync(md, 'utf8') } catch { return undefined }
  const { data, body } = parseFrontmatter(text)
  return {
    name: str(data, 'name') ?? name,
    description: str(data, 'description') ?? firstHeading(body) ?? '',
    path, realPath: link.realPath, scope, label,
    origin: link.isLink ? 'link' : 'real',
    hops: link.hops,
    broken: false,
    winner: false,
    shadows: [],
    disableModelInvocation: data['disable-model-invocation'] === true,
    allowedTools: str(data, 'allowed-tools'),
    plugin,
  }
}

function collect(dir: string, scope: Scope, label: string, ctx: ScanContext, plugin?: string): SkillEntry[] {
  ctx.track(dir)
  return listDirs(dir)
    .map((n) => readSkill(dir, n, scope, label, plugin))
    .filter((s): s is SkillEntry => Boolean(s))
}

export function scanSkills(ctx: ScanContext, plugins: PluginEntry[]): SkillEntry[] {
  const found: SkillEntry[] = []

  found.push(...collect(join(HOME, '.claude', 'skills'), 'user', 'user', ctx))

  for (const dir of [...ctx.dirs].reverse()) {
    if (dir === HOME) continue
    const scope = ctx.scopeOf.get(dir) ?? 'ancestor'
    const label = ctx.labelOf.get(dir) ?? tilde(dir)
    found.push(...collect(join(dir, '.claude', 'skills'), scope, label, ctx))
  }

  for (const p of plugins) {
    if (!p.enabled || !p.installed) continue
    found.push(...collect(join(p.installPath, 'skills'), 'plugin', p.name, ctx, p.name))
  }

  // precedence: for each name, the tightest scope wins; the rest are shadowed
  const byName = new Map<string, SkillEntry[]>()
  for (const s of found) {
    const key = s.plugin ? `${s.plugin}:${s.name}` : s.name
    const list = byName.get(key) ?? []
    list.push(s)
    byName.set(key, list)
  }
  for (const list of byName.values()) {
    const live = list.filter((s) => !s.broken)
    const sorted = [...live].sort((a, b) => RANK[b.scope] - RANK[a.scope])
    const winner = sorted[0]
    if (winner) {
      winner.winner = true
      winner.shadows = sorted.slice(1).map((s) => s.label)
    }
  }

  return found.sort((a, b) =>
    Number(b.winner) - Number(a.winner) || a.name.localeCompare(b.name) || RANK[b.scope] - RANK[a.scope])
}
