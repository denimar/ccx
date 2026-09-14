import { join } from 'node:path'
import { readJsonc } from '../util/jsonc.js'
import { isFile, tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { HookEntry, PluginEntry, Scope } from './types.js'

/** Shape: { <Event>: [ { matcher?, hooks: [ { type, command, timeout?, statusMessage? } ] } ] } */
function flatten(
  spec: unknown, source: string, scope: Scope, label: string, plugin?: string,
): HookEntry[] {
  if (!spec || typeof spec !== 'object') return []
  const out: HookEntry[] = []
  for (const [event, groups] of Object.entries(spec as Record<string, unknown>)) {
    if (!Array.isArray(groups)) continue
    for (const group of groups) {
      const matcher = typeof group?.matcher === 'string' ? group.matcher : '*'
      for (const h of group?.hooks ?? []) {
        out.push({
          event,
          matcher: matcher || '*',
          command: String(h?.command ?? '').replace(/\s+/g, ' ').trim(),
          type: String(h?.type ?? 'command'),
          timeout: typeof h?.timeout === 'number' ? h.timeout : undefined,
          statusMessage: typeof h?.statusMessage === 'string' ? h.statusMessage : undefined,
          source: tilde(source),
          scope,
          label,
          plugin,
        })
      }
    }
  }
  return out
}

const EVENT_ORDER = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'Notification', 'Stop', 'SubagentStop', 'PreCompact', 'SessionEnd',
]

export function scanHooks(ctx: ScanContext, plugins: PluginEntry[]): HookEntry[] {
  const out: HookEntry[] = []

  for (const sf of ctx.settingsFiles) {
    out.push(...flatten(sf.data.hooks, sf.path, sf.scope, sf.label))
  }

  for (const p of plugins) {
    if (!p.enabled || !p.installed) continue
    // caveman-style: hooks inlined in the plugin manifest
    const manifestPath = join(p.installPath, '.claude-plugin', 'plugin.json')
    ctx.track(manifestPath)
    const manifest = readJsonc<any>(manifestPath)
    out.push(...flatten(manifest?.hooks, manifestPath, 'plugin', p.name, p.name))
    // vercel-style: a separate hooks/hooks.json, optionally wrapped in "hooks"
    const hooksPath = join(p.installPath, 'hooks', 'hooks.json')
    if (isFile(hooksPath)) {
      ctx.track(hooksPath)
      const file = readJsonc<any>(hooksPath)
      out.push(...flatten(file?.hooks ?? file, hooksPath, 'plugin', p.name, p.name))
    }
  }

  return out.sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event), bi = EVENT_ORDER.indexOf(b.event)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.label.localeCompare(b.label)
  })
}
