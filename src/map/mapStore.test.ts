import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPolyline, emptyGraph } from './graph'
import { DEFAULT_PARAMS, useMapStore } from './mapStore'

const wall = (): ReturnType<typeof emptyGraph> =>
  addPolyline(emptyGraph(), [
    [0, 0],
    [10, 0],
  ])

describe('undo of wall edits', () => {
  beforeEach(() => {
    // analysis runs are scheduled but never fired: only the undo bookkeeping is under test
    vi.useFakeTimers()
    useMapStore.setState({
      graph: emptyGraph(),
      history: [],
      baseline: emptyGraph(),
      selected: null,
      params: DEFAULT_PARAMS,
      loaded: true,
    })
  })
  afterEach(() => vi.useRealTimers())

  it('makes each edit one step and undoes them in order', () => {
    const s = useMapStore.getState()
    s.setGraph(wall())
    s.setGraph(
      addPolyline(useMapStore.getState().graph, [
        [0, 50],
        [10, 50],
      ])
    )
    expect(useMapStore.getState().history).toHaveLength(2)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().graph.edges).toHaveLength(1)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().graph.edges).toHaveLength(0)
  })

  it('makes one step out of a drag', () => {
    const s = useMapStore.getState()
    s.setGraph(wall())
    s.beginGesture()
    for (let x = 1; x <= 5; x++) {
      const g = useMapStore.getState().graph
      s.setGraph({ ...g, nodes: g.nodes.map((n, i) => (i ? { ...n, x: 10 + x } : n)) }, true)
    }
    s.endGesture()
    expect(useMapStore.getState().history).toHaveLength(2)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().graph.nodes[1].x).toBe(10)
  })

  it('deletes the selected node or line, and forgets a selection that is gone', () => {
    const s = useMapStore.getState()
    s.setGraph(wall())
    const g = useMapStore.getState().graph
    s.select({ kind: 'edge', id: g.edges[0].id })
    useMapStore.getState().deleteSelected()
    expect(useMapStore.getState().graph.nodes).toHaveLength(0)
    expect(useMapStore.getState().selected).toBeNull()
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().graph.edges).toHaveLength(1)
  })

  it('clearing edits returns the walls the map was opened with', () => {
    useMapStore.setState({ baseline: wall() })
    useMapStore.getState().setGraph(emptyGraph())
    useMapStore.getState().clearEdits()
    expect(useMapStore.getState()).toMatchObject({ history: [] })
    expect(useMapStore.getState().graph.edges).toHaveLength(1)
  })

  it('keeps the smallest-room setting out of the history', () => {
    useMapStore.getState().setParam('minRoom', 1)
    useMapStore.getState().setParam('sens', 20)
    expect(useMapStore.getState().history).toHaveLength(0)
    expect(useMapStore.getState().params).toMatchObject({ minRoom: 1, sens: 20 })
  })
})
