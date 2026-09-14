import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensurePath, resolveBin, sessionPath } from '../src/util/env.js'
import { selfCommand } from '../src/util/self.js'

let dir: string
let originalPath: string | undefined

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ccx-bin-'))
  originalPath = process.env.PATH
})
afterEach(() => { process.env.PATH = originalPath })

function fakeBin(name: string): string {
  const p = join(dir, name)
  writeFileSync(p, '#!/bin/sh\ntrue\n')
  chmodSync(p, 0o755)
  return p
}

describe('resolveBin', () => {
  it('finds a binary on PATH and returns an absolute path', () => {
    const p = fakeBin('ccx-probe')
    process.env.PATH = dir
    expect(resolveBin('ccx-probe')).toBe(p)
  })

  it('falls back to a known location when PATH has nothing', () => {
    const p = fakeBin('ccx-fallback')
    process.env.PATH = '/nonexistent'
    expect(resolveBin('ccx-fallback', [p])).toBe(p)
  })

  it('returns undefined instead of a bare name the caller would ENOENT on', () => {
    process.env.PATH = '/nonexistent'
    expect(resolveBin('definitely-not-installed-xyz')).toBeUndefined()
  })

  it('resolves node even under the bare desktop session PATH', () => {
    // the exact failure that made the dock icon do nothing
    process.env.PATH = sessionPath()
    expect(resolveBin('node')).toBe(process.execPath)
  })
})

describe('ensurePath', () => {
  it("puts node's own directory back on PATH", () => {
    process.env.PATH = sessionPath()
    ensurePath()
    const dirs = (process.env.PATH ?? '').split(delimiter)
    expect(dirs).toContain(join(process.execPath, '..'))
  })

  it('does not duplicate entries when run twice', () => {
    process.env.PATH = sessionPath()
    ensurePath()
    const once = process.env.PATH
    ensurePath()
    expect(process.env.PATH).toBe(once)
  })
})

describe('selfCommand', () => {
  it('re-invokes ccx through an absolute node, never a shebang', () => {
    mkdirSync(dir, { recursive: true })
    expect(selfCommand()[0]).toBe(process.execPath)
    expect(selfCommand()[1]?.startsWith('/')).toBe(true)
  })
})
