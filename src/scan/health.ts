import { existsSync } from 'node:fs'
import { tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import { permissionMode } from './settings.js'
import type { HarnessInfo, HealthIssue, McpEntry, MemoryInfo, PluginEntry, SkillEntry } from './types.js'

export function scanHealth(
  ctx: ScanContext,
  parts: { skills: SkillEntry[]; mcp: McpEntry[]; plugins: PluginEntry[]; harness: HarnessInfo; memory: MemoryInfo },
): HealthIssue[] {
  const out: HealthIssue[] = []

  for (const s of parts.skills.filter((x) => x.broken)) {
    out.push({
      level: 'error',
      title: `skill "${s.name}" is a broken symlink`,
      detail: `${tilde(s.path)} → ${tilde(s.realPath)} (target missing)`,
      path: s.path,
    })
  }

  for (const m of parts.mcp.filter((x) => x.secretsInline)) {
    out.push({
      level: 'error',
      title: `MCP server "${m.name}" has a credential in plaintext`,
      detail: `declared in ${m.source} — move it to an env var or a secret store`,
      path: m.source,
    })
  }

  for (const m of parts.mcp.filter((x) => x.status === 'pending')) {
    out.push({
      level: 'warn',
      title: `MCP server "${m.name}" is not approved for this project`,
      detail: `from ${m.source}; approve it in a Claude Code session to connect`,
      path: m.source,
    })
  }

  for (const p of parts.plugins.filter((x) => x.enabled && !x.marketplaceKnown)) {
    out.push({
      level: 'warn',
      title: `plugin "${p.id}" is enabled but its marketplace is unknown`,
      detail: `"${p.marketplace}" is not in known_marketplaces.json — the plugin will not load`,
    })
  }

  for (const p of parts.plugins.filter((x) => x.enabled && !x.installed)) {
    out.push({
      level: 'warn',
      title: `plugin "${p.id}" is enabled but not installed`,
      detail: p.installPath ? `${tilde(p.installPath)} is missing` : 'no install record found',
    })
  }

  // settings that point at directories which no longer exist
  const { additionalDirectories } = permissionMode(ctx)
  for (const d of additionalDirectories) {
    if (!existsSync(d)) {
      out.push({
        level: 'warn',
        title: 'permissions.additionalDirectories points at a missing directory',
        detail: tilde(d),
        path: d,
      })
    }
  }
  for (const sf of ctx.settingsFiles) {
    for (const [k, v] of Object.entries((sf.data.env ?? {}) as Record<string, unknown>)) {
      const s = String(v)
      if (s.startsWith('/') && !existsSync(s)) {
        out.push({ level: 'warn', title: `env.${k} points at a missing path`, detail: `${tilde(s)} (${tilde(sf.path)})`, path: sf.path })
      }
    }
  }

  for (const f of parts.memory.files) {
    for (const imp of f.imports) {
      if (!existsSync(imp)) {
        out.push({ level: 'warn', title: `${f.kind} imports a missing file`, detail: `${tilde(f.path)} → @${tilde(imp)}`, path: f.path })
      }
    }
  }

  if (parts.harness.isHarness && parts.harness.registryPath && parts.harness.registered === false) {
    out.push({
      level: 'warn',
      title: `"${ctx.name}" is not registered in projects.yaml`,
      detail: `${tilde(parts.harness.registryPath)} — bin/sync.sh will not wire skills, memory or direnv for it`,
      path: parts.harness.registryPath,
    })
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
}
