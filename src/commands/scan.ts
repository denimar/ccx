import { findProjectRoot, scan, fetchMcpHealth } from '../scan/index.js'
import { renderReport } from '../ui/report.js'

export async function cmdScan(args: string[]): Promise<number> {
  const json = args.includes('--json')
  const health = args.includes('--health')
  const rootArg = args.find((a) => !a.startsWith('-'))
  const root = findProjectRoot(rootArg ?? process.cwd())

  const report = scan(root)
  if (health) report.mcp = await fetchMcpHealth(root, report.mcp)

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    process.stdout.write(renderReport(report, { width: process.stdout.columns || 80 }))
  }
  return 0
}
