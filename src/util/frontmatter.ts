import { parse as parseYaml } from 'yaml'

export interface Frontmatter {
  data: Record<string, unknown>
  body: string
  hasFrontmatter: boolean
}

/**
 * Parse YAML frontmatter. Many real files in the wild have none at all
 * (e.g. agents-tests-qa.md, run-ticket.md) — that is not an error.
 */
export function parseFrontmatter(text: string): Frontmatter {
  if (!text.startsWith('---')) return { data: {}, body: text, hasFrontmatter: false }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: text, hasFrontmatter: false }
  const raw = text.slice(text.indexOf('\n') + 1, end)
  const body = text.slice(text.indexOf('\n', end + 1) + 1)
  try {
    const data = parseYaml(raw) as unknown
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { data: data as Record<string, unknown>, body, hasFrontmatter: true }
    }
  } catch {
    // malformed frontmatter: fall through, still show the file
  }
  return { data: {}, body, hasFrontmatter: false }
}

export function str(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key]
  if (typeof v === 'string') return v.trim().replace(/\s+/g, ' ')
  if (Array.isArray(v)) return v.map(String).join(', ')
  return undefined
}

export function firstHeading(body: string): string | undefined {
  const m = body.match(/^#\s+(.+)$/m)
  return m?.[1]?.trim()
}
