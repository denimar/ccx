import React from 'react'
import { render } from 'ink'
import { findProjectRoot } from '../scan/index.js'
import { App } from '../ui/App.js'

export async function cmdPanel(args: string[]): Promise<number> {
  const i = args.indexOf('--root')
  const rootArg = i >= 0 ? args[i + 1] : args.find((a) => !a.startsWith('-'))
  const root = findProjectRoot(rootArg ?? process.cwd())

  const app = render(React.createElement(App, { root }), { exitOnCtrlC: true })
  await app.waitUntilExit()
  return 0
}
