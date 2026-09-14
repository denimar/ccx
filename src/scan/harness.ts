import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { isDir, isFile, listDirs } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { HarnessInfo } from './types.js'

/**
 * projects.yaml is parsed the same way bin/sync.sh parses it: two spaces,
 * a name, a colon. Not real YAML — matching the harness keeps ccx honest
 * about what is actually registered.
 */
export function parseProjectsYaml(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^ {2}([A-Za-z0-9._-]+):\s*(\S.*)$/)
    if (m?.[1]) out[m[1]] = (m[2] ?? '').trim()
  }
  return out
}

export function scanHarness(ctx: ScanContext): HarnessInfo {
  if (!ctx.harnessRoot) {
    return { isHarness: false, orphanLayers: [] }
  }

  const workspace = ctx.workspace
  const info: HarnessInfo = {
    isHarness: true,
    harnessRoot: ctx.harnessRoot,
    workspace: workspace ? basename(workspace) : undefined,
    orphanLayers: [],
  }

  if (!workspace) return info

  const registry = join(workspace, 'projects.yaml')
  ctx.track(registry)
  if (isFile(registry)) {
    info.registryPath = registry
    const registered = parseProjectsYaml(readFileSync(registry, 'utf8'))
    info.registered = Object.hasOwn(registered, ctx.name)

    // personal layers left behind by projects that are no longer checked out
    const layersDir = join(workspace, '_projects')
    if (isDir(layersDir)) {
      info.orphanLayers = listDirs(layersDir).filter((n) => !isDir(join(workspace, n)))
    }
  }

  const layer = join(workspace, '_projects', ctx.name)
  if (isDir(layer)) info.projectLayer = layer

  const envrc = join(ctx.root, '.envrc')
  if (isFile(envrc)) info.envrc = envrc
  const secrets = join(workspace, '_projects', ctx.name, 'secrets.env')
  if (isFile(secrets)) info.secretsEnv = secrets

  return info
}
