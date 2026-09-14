import { existsSync, lstatSync, readdirSync, readlinkSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

export const HOME = homedir()

/**
 * Ancestors of `start`, nearest first, stopping after $HOME.
 * This is the heart of the scanner: in a layered harness the workspace dir
 * and repo root carry real CLAUDE.md / .claude/skills / .mcp.json, so a
 * project-dir-only scan sees almost none of the infra that is actually live.
 */
export function ancestors(start: string): string[] {
  const out: string[] = []
  let dir = resolve(start)
  for (;;) {
    out.push(dir)
    if (dir === HOME || dir === sep) break
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return out
}

export function isDir(p: string): boolean {
  try { return statSync(p).isDirectory() } catch { return false }
}

export function isFile(p: string): boolean {
  try { return statSync(p).isFile() } catch { return false }
}

export interface LinkInfo {
  isLink: boolean
  broken: boolean
  /** number of symlink hops followed (harness skills are often 2 deep) */
  hops: number
  realPath: string
}

export function linkInfo(p: string): LinkInfo {
  let hops = 0
  let cur = p
  try {
    while (lstatSync(cur).isSymbolicLink()) {
      hops++
      const target = readlinkSync(cur)
      cur = target.startsWith(sep) ? target : resolve(dirname(cur), target)
      if (hops > 10) break
      if (!existsSync(cur)) return { isLink: true, broken: true, hops, realPath: cur }
    }
  } catch {
    return { isLink: hops > 0, broken: true, hops, realPath: cur }
  }
  let real = cur
  try { real = realpathSync(cur) } catch { /* keep cur */ }
  return { isLink: hops > 0, broken: false, hops, realPath: real }
}

export function listDirs(p: string): string[] {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => e.name)
      .sort()
  } catch { return [] }
}

export function listFiles(p: string, ext?: string[]): string[] {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isFile() || e.isSymbolicLink())
      .map((e) => e.name)
      .filter((n) => !ext || ext.some((x) => n.endsWith(x)))
      .sort()
  } catch { return [] }
}

/** Directories ccx must never descend into. */
export function isIgnoredPath(p: string): boolean {
  return p.includes(`${sep}node_modules${sep}`)
    || p.includes(`${sep}.claude${sep}worktrees${sep}`)
    || p.includes(`${sep}.git${sep}`)
}

export function tilde(p: string): string {
  return p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p
}

export const joinp = join
