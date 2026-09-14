import { describe, expect, it } from 'vitest'
import { parseJsonc } from '../src/util/jsonc.js'
import { parseFrontmatter, str } from '../src/util/frontmatter.js'
import { isInlineSecret, looksSecret, redact, redactArgs } from '../src/util/mask.js'
import { parseProjectsYaml } from '../src/scan/harness.js'

describe('parseJsonc', () => {
  it('strips line and block comments and trailing commas', () => {
    const out = parseJsonc<any>(`{
      // a comment
      "a": 1, /* inline */
      "b": ["x", "y",],
    }`)
    expect(out).toEqual({ a: 1, b: ['x', 'y'] })
  })

  it('keeps comment-looking sequences inside strings', () => {
    expect(parseJsonc<any>('{"url": "https://x.dev//y"}').url).toBe('https://x.dev//y')
  })
})

describe('parseFrontmatter', () => {
  it('reads a normal skill header', () => {
    const { data, hasFrontmatter } = parseFrontmatter('---\nname: demo\ndescription: Does a thing\n---\n# Body\n')
    expect(hasFrontmatter).toBe(true)
    expect(str(data, 'name')).toBe('demo')
  })

  it('folds multi-line descriptions onto one line', () => {
    const { data } = parseFrontmatter('---\nname: d\ndescription: >\n  line one\n  line two\n---\nbody')
    expect(str(data, 'description')).toBe('line one line two')
  })

  it('tolerates files with no frontmatter at all', () => {
    // real agents and commands in the wild start straight at a heading
    const { data, hasFrontmatter } = parseFrontmatter('# Pipeline Tests QA\n\nprose')
    expect(hasFrontmatter).toBe(false)
    expect(data).toEqual({})
  })

  it('does not throw on malformed yaml', () => {
    expect(() => parseFrontmatter('---\n: : :\n---\nbody')).not.toThrow()
  })
})

describe('mask', () => {
  it('detects and redacts common credential shapes', () => {
    expect(looksSecret('ghp_abcdefghijklmnopqrstuvwxyz1234')).toBe(true)
    expect(redact('ghp_abcdefghijklmnopqrstuvwxyz1234')).not.toContain('abcdefghij')
    expect(redact('postgres://admin:hunter2@db.internal/app')).toBe('postgres://admin:••••@db.internal/app')
    expect(redactArgs(['--dsn', 'mysql://u:p@h/d'])).toEqual(['--dsn', 'mysql://u:••••@h/d'])
  })

  it('treats ${VAR} indirection as not-a-secret', () => {
    expect(isInlineSecret('API_KEY', '${MY_KEY}')).toBe(false)
    expect(isInlineSecret('OUTPUT_DIR', '/tmp/out')).toBe(false)
  })

  it('flags a long opaque literal behind a secret-sounding key', () => {
    expect(isInlineSecret('TWENTY_FIRST_API_KEY', '8f2c1a9e4b7d6053ffee')).toBe(true)
    expect(isInlineSecret('NODEMAILER_PASS', 'abcd efgh ijkl mnop')).toBe(false) // spaces: not opaque
  })
})

describe('parseProjectsYaml', () => {
  it('matches bin/sync.sh: exactly two spaces, name, colon', () => {
    const out = parseProjectsYaml([
      'projects:',
      '  core: https://github.com/org/core.git',
      '  scratch: local',
      '  # commented: https://x',
      '    nested: https://too-deep',
      'top: https://not-indented',
    ].join('\n'))
    expect(out).toEqual({ core: 'https://github.com/org/core.git', scratch: 'local' })
  })
})
