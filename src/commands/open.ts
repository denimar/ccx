import { findProjectRoot } from '../scan/index.js'
import { openSplit, type Engine } from '../split/index.js'

export async function cmdOpen(args: string[]): Promise<number> {
  const engineIdx = args.indexOf('--engine')
  const engine = engineIdx >= 0 ? (args[engineIdx + 1] as Engine) : undefined
  const rest = engineIdx >= 0 ? [...args.slice(0, engineIdx), ...args.slice(engineIdx + 2)] : args

  const dirIdx = rest.indexOf('--dir')
  const dir = dirIdx >= 0 ? rest[dirIdx + 1] : undefined
  const claudeArgs = dirIdx >= 0 ? [...rest.slice(0, dirIdx), ...rest.slice(dirIdx + 2)] : rest

  const root = findProjectRoot(dir ?? process.cwd())
  return openSplit(root, claudeArgs, engine)
}
