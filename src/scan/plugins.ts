import { join } from 'node:path'
import { readJsonc } from '../util/jsonc.js'
import { HOME, isDir, isFile, listDirs, listFiles } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { PluginEntry, Scope } from './types.js'

interface InstallRecord {
  scope?: string
  projectPath?: string
  installPath?: string
  version?: string
  gitCommitSha?: string
}

export const PLUGIN_ROOT = join(HOME, '.claude', 'plugins')

function countHooks(installPath: string): number {
  let n = 0
  const manifest = readJsonc<any>(join(installPath, '.claude-plugin', 'plugin.json'))
  const inline = manifest?.hooks
  if (inline && typeof inline === 'object') {
    for (const arr of Object.values(inline as Record<string, any[]>)) {
      for (const group of arr ?? []) n += (group?.hooks?.length ?? 0)
    }
  }
  const file = readJsonc<any>(join(installPath, 'hooks', 'hooks.json'))
  const fromFile = file?.hooks ?? file
  if (fromFile && typeof fromFile === 'object') {
    for (const arr of Object.values(fromFile as Record<string, any[]>)) {
      if (!Array.isArray(arr)) continue
      for (const group of arr) n += (group?.hooks?.length ?? 0)
    }
  }
  return n
}

export function scanPlugins(ctx: ScanContext): PluginEntry[] {
  const installedFile = join(PLUGIN_ROOT, 'installed_plugins.json')
  const marketplacesFile = join(PLUGIN_ROOT, 'known_marketplaces.json')
  ctx.track(installedFile)
  ctx.track(marketplacesFile)

  const installed = readJsonc<any>(installedFile)?.plugins ?? {}
  const marketplaces = readJsonc<any>(marketplacesFile) ?? {}

  // enabledPlugins is merged across settings files, tightest scope last
  const enabled = new Map<string, { on: boolean; source: string; scope: Scope; label: string }>()
  for (const sf of ctx.settingsFiles) {
    const ep = sf.data.enabledPlugins
    if (!ep || typeof ep !== 'object') continue
    for (const [id, on] of Object.entries(ep as Record<string, boolean>)) {
      enabled.set(id, { on: Boolean(on), source: sf.path, scope: sf.scope, label: sf.label })
    }
  }

  const ids = new Set<string>([...Object.keys(installed), ...enabled.keys()])
  const out: PluginEntry[] = []

  for (const id of [...ids].sort()) {
    const [name = id, marketplace = ''] = id.split('@')
    const records: InstallRecord[] = Array.isArray(installed[id]) ? installed[id] : []
    // prefer a record scoped to this project, else the user-scope one
    const record =
      records.find((r) => r.projectPath && ctx.root.startsWith(r.projectPath)) ??
      records.find((r) => r.scope === 'user') ??
      records[0]
    const installPath = record?.installPath ?? ''
    const en = enabled.get(id)
    out.push({
      id,
      name,
      marketplace,
      version: record?.version ?? record?.gitCommitSha?.slice(0, 12) ?? '—',
      enabled: en?.on ?? false,
      enabledSource: en?.source,
      scope: en?.scope ?? 'user',
      label: en?.label ?? 'user',
      installPath,
      marketplaceKnown: Boolean(marketplaces[marketplace]),
      installed: Boolean(installPath && isDir(installPath)),
      contributes: {
        skills: installPath ? listDirs(join(installPath, 'skills')).length : 0,
        agents: installPath ? listFiles(join(installPath, 'agents'), ['.md']).filter((f) => !f.endsWith('.tmpl')).length : 0,
        commands: installPath ? listFiles(join(installPath, 'commands'), ['.md', '.toml']).length : 0,
        hooks: installPath ? countHooks(installPath) : 0,
        mcp: installPath && isFile(join(installPath, '.mcp.json'))
          ? Object.keys(readJsonc<any>(join(installPath, '.mcp.json'))?.mcpServers ?? {}).length
          : 0,
      },
    })
  }

  return out.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name))
}
