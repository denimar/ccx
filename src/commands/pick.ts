import React from 'react'
import { render } from 'ink'
import { Picker } from '../ui/Picker.js'
import { openSplit } from '../split/index.js'

export async function cmdPick(claudeArgs: string[]): Promise<number> {
  let picked: string | undefined
  const app = render(React.createElement(Picker, {
    onPick: (path: string) => { picked = path; app.unmount() },
  }))
  await app.waitUntilExit()
  app.clear()
  if (!picked) return 0
  process.chdir(picked)
  return openSplit(picked, claudeArgs)
}
