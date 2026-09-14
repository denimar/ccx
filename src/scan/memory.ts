import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { HOME, isFile, linkInfo, listFiles, tilde } from '../util/walk.js'
import type { ScanContext } from './context.js'
import type { MemoryFile, MemoryInfo } from './types.js'

const KINDS = ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md'] as const

/** `@path/to/file.md` import lines — Claude Code inlines these at load time. */
function findImports(text: string, dir: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*@([^\s`]+)\s*$/)
    if (m?.[1]) out.push(resolve(dir, m[1]))
  }
  return out
}

function isStub(text: string, imports: string[]): boolean {
  if (!imports.length) return false
  const meat = text
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('<!--') && !l.trim().startsWith('@'))
  return meat.length === 0
}

export function scanMemory(ctx: ScanContext): MemoryInfo {
  const files: MemoryFile[] = []

  for (const dir of ctx.dirs) {
    for (const kind of KINDS) {
      const path = join(dir, kind)
      ctx.track(path)
      if (!isFile(path)) continue
      let text = ''
      try { text = readFileSync(path, 'utf8') } catch { continue }
      const link = linkInfo(path)
      const imports = findImports(text, dir)
      files.push({
        kind,
        path,
        dir,
        scope: ctx.scopeOf.get(dir) ?? 'ancestor',
        label: ctx.labelOf.get(dir) ?? tilde(dir),
        bytes: statSync(path).size,
        lines: text.split('\n').length,
        imports,
        symlinkTo: link.isLink ? tilde(link.realPath) : undefined,
        isImportStub: isStub(text, imports),
      })
    }
  }

  // ~/.claude/CLAUDE.md is user-scope memory and lives outside the walk's
  // CLAUDE.md convention (it sits inside .claude/, not beside it).
  const userMemory = join(HOME, '.claude', 'CLAUDE.md')
  ctx.track(userMemory)
  if (isFile(userMemory)) {
    const text = readFileSync(userMemory, 'utf8')
    files.push({
      kind: 'CLAUDE.md',
      path: userMemory,
      dir: join(HOME, '.claude'),
      scope: 'user',
      label: 'user',
      bytes: statSync(userMemory).size,
      lines: text.split('\n').length,
      imports: findImports(text, join(HOME, '.claude')),
      isImportStub: false,
    })
  }

  // auto-memory directory: strongest settings file that declares one wins
  let autoMemoryDirectory: string | undefined
  let autoMemorySource: string | undefined
  for (const sf of ctx.settingsFiles) {
    if (typeof sf.data.autoMemoryDirectory === 'string') {
      autoMemoryDirectory = sf.data.autoMemoryDirectory
      autoMemorySource = sf.path
    }
  }
  let autoMemoryFiles = 0
  if (autoMemoryDirectory) {
    ctx.track(autoMemoryDirectory)
    autoMemoryFiles = listFiles(autoMemoryDirectory, ['.md']).length
  }

  return { files, autoMemoryDirectory, autoMemoryFiles, autoMemorySource }
}
