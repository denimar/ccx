import { describe, expect, it } from 'vitest'
import { withBypassOption } from '../src/split/index.js'

describe('withBypassOption', () => {
  it('allows bypass mode by default', () => {
    expect(withBypassOption(['--resume'], {})).toEqual(['--allow-dangerously-skip-permissions', '--resume'])
  })
  it('does not duplicate the flag', () => {
    expect(withBypassOption(['--allow-dangerously-skip-permissions'], {})).toEqual(['--allow-dangerously-skip-permissions'])
  })
  it('respects an explicit --dangerously-skip-permissions', () => {
    expect(withBypassOption(['--dangerously-skip-permissions'], {})).toEqual(['--dangerously-skip-permissions'])
  })
  it('opts out with CCX_NO_BYPASS=1', () => {
    expect(withBypassOption(['-c'], { CCX_NO_BYPASS: '1' })).toEqual(['-c'])
  })
})
