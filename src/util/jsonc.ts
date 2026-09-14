import { readFileSync } from 'node:fs'

/** Strip // and /* *\/ comments and trailing commas, then JSON.parse. */
export function parseJsonc<T = unknown>(text: string): T {
  let out = ''
  let inStr = false
  let esc = false
  let i = 0
  while (i < text.length) {
    const c = text[i]!
    if (inStr) {
      out += c
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      i++
      continue
    }
    if (c === '"') { inStr = true; out += c; i++; continue }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue }
    out += c
    i++
  }
  out = out.replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(out) as T
}

/** Read + parse a JSON(C) file. Returns undefined on any failure — a broken
 *  config file must never take the HUD down. */
export function readJsonc<T = unknown>(path: string): T | undefined {
  try {
    return parseJsonc<T>(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}
