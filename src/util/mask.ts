/**
 * The only sanctioned path by which config values reach the UI.
 * ccx displays other people's machines' config; leaking a token into a
 * screenshot or a `ccx scan --json` paste is the one unrecoverable bug.
 */

const SECRET_PATTERNS: RegExp[] = [
  /\b(gh[pousr]_[A-Za-z0-9]{16,})/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})/g,
  /\b(sk-[A-Za-z0-9_-]{16,})/g,
  /\b(xox[abprs]-[A-Za-z0-9-]{10,})/g,
  /\b(AKIA[0-9A-Z]{16})/g,
  /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
  /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s:/@]+):([^\s@]+)@/g, // scheme://user:pass@
]

/** True when a string looks like it carries a credential. */
export function looksSecret(value: string): boolean {
  return SECRET_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(value) })
}

/** Replace any credential-shaped substring with a marker, keeping the shape readable. */
export function redact(value: string): string {
  let out = value
  out = out.replace(/\b([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s:/@]+):([^\s@]+)@/g, '$1:••••@')
  for (const re of SECRET_PATTERNS.slice(0, -1)) {
    re.lastIndex = 0
    out = out.replace(re, (m) => `${m.slice(0, 4)}••••`)
  }
  return out
}

const SECRET_KEY = /(^|_)(KEY|TOKEN|SECRET|PASS|PASSWORD|PWD|CREDENTIALS?|DSN|AUTH)$/i

/**
 * A value is credential-shaped either because it matches a known token format
 * or because a secret-sounding key holds a long opaque literal. `${VAR}`
 * references are indirection, not secrets.
 */
export function isInlineSecret(key: string, value: string): boolean {
  if (/^\$\{[^}]+\}$/.test(value) || value.startsWith('$')) return false
  if (looksSecret(value)) return true
  return SECRET_KEY.test(key) && value.length >= 12 && !/\s/.test(value)
}

/** env objects are never shown by value — only their key names travel. */
export function envKeys(env: unknown): string[] {
  if (!env || typeof env !== 'object') return []
  return Object.keys(env as Record<string, unknown>).sort()
}

/** args may legitimately carry a DSN; redact each element. */
export function redactArgs(args: unknown): string[] {
  if (!Array.isArray(args)) return []
  return args.map((a) => redact(String(a)))
}
