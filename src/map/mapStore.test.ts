import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PARAMS, useMapStore } from './mapStore'

const wall = { type: 'wall' as const, x1: 0, y1: 0, x2: 10, y2: 0 }

describe('undo of automatic wall detection', () => {
  beforeEach(() => {
    // analysis runs are scheduled but never fired: only the undo bookkeeping is under test
    vi.useFakeTimers()
    const base = {
      ops: [],
      history: [],
      auto: true,
      params: DEFAULT_PARAMS,
      loaded: true,
    }
    useMapStore.setState({
      ...base,
      baseline: { ops: [], auto: true, sens: 70, minLen: 6, gap: 6.5 },
    })
  })
  afterEach(() => vi.useRealTimers())

  it('undoes switching detection off and on', () => {
    const s = useMapStore.getState()
    s.setAuto(false)
    expect(useMapStore.getState().history).toHaveLength(1)
    s.setAuto(false) // same setting again is no step
    s.setAuto(true)
    expect(useMapStore.getState().history).toHaveLength(2)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().auto).toBe(false)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().auto).toBe(true)
    expect(useMapStore.getState().history).toHaveLength(0)
  })

  it('makes one step out of a slider drag, and one per slider', () => {
    const s = useMapStore.getState()
    s.setParam('sens', 60)
    s.setParam('sens', 50)
    s.setParam('sens', 40)
    expect(useMapStore.getState().history).toHaveLength(1)
    s.setParam('minLen', 9)
    expect(useMapStore.getState().history).toHaveLength(2)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().params.minLen).toBe(6)
    expect(useMapStore.getState().params.sens).toBe(40)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().params.sens).toBe(70)
  })

  it('does not count the smallest-room slider, and keeps it when undoing', () => {
    const s = useMapStore.getState()
    s.setParam('minRoom', 1)
    expect(useMapStore.getState().history).toHaveLength(0)
    s.setParam('gap', 3)
    s.setParam('minRoom', 0.5)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().params).toMatchObject({ gap: 6.5, minRoom: 0.5 })
  })

  it('undoes drawn items and detection changes in the order they happened', () => {
    useMapStore.getState().addOp(wall)
    useMapStore.getState().setAuto(false)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().auto).toBe(true)
    expect(useMapStore.getState().ops).toHaveLength(1)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().ops).toHaveLength(0)
  })

  it('clearing edits returns the detection settings of the opened map too', () => {
    useMapStore.getState().setAuto(false)
    useMapStore.getState().setParam('sens', 20)
    useMapStore.getState().addOp(wall)
    useMapStore.getState().clearEdits()
    const s = useMapStore.getState()
    expect(s).toMatchObject({ auto: true, history: [], ops: [] })
    expect(s.params.sens).toBe(70)
  })
})
