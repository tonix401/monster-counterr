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
      future: [],
      tokens: {},
      ranges: {},
      players: {},
      width: 800,
      height: 600,
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

  it('deletes a selected token from the map: monster, player and fire', () => {
    const s = useMapStore.getState()
    s.placeToken('m1', { x: 5, y: 5 })
    s.placeToken('player:abc', { x: 6, y: 6 })
    const fire = s.addLight({ x: 7, y: 7 })
    for (const id of ['m1', 'player:abc', fire]) {
      useMapStore.getState().select({ kind: 'token', id })
      useMapStore.getState().deleteSelected()
      expect(useMapStore.getState().tokens[id]).toBeUndefined()
      expect(useMapStore.getState().selected).toBeNull()
    }
    expect(useMapStore.getState().ranges[fire]).toBeUndefined()
  })

  it('clearing edits returns the walls the map was opened with', () => {
    useMapStore.setState({ baseline: wall() })
    useMapStore.getState().setGraph(emptyGraph())
    useMapStore.getState().clearEdits()
    expect(useMapStore.getState().graph.edges).toHaveLength(1)
    useMapStore.getState().undoEdit()
    expect(useMapStore.getState().graph.edges).toHaveLength(0)
  })

  it('undoes and redoes token moves, light changes and removals', () => {
    const s = () => useMapStore.getState()
    s().placeToken('m1', { x: 5, y: 5 })
    s().placeToken('m1', { x: 50, y: 50 })
    const fire = s().addLight({ x: 9, y: 9 })
    s().setRange(fire, 40)
    s().select({ kind: 'token', id: fire })
    s().deleteSelected()
    expect(s().tokens[fire]).toBeUndefined()
    s().undoEdit()
    expect(s().tokens[fire]).toEqual({ x: 9, y: 9 })
    expect(s().ranges[fire]).toBe(40)
    s().undoEdit()
    expect(s().ranges[fire]).toBe(20)
    s().undoEdit()
    s().undoEdit()
    expect(s().tokens.m1).toEqual({ x: 5, y: 5 })
    s().redoEdit()
    expect(s().tokens.m1).toEqual({ x: 50, y: 50 })
    s().placeToken('m1', { x: 1, y: 1 })
    expect(s().future).toHaveLength(0)
  })

  it('keeps the smallest-room setting out of the history', () => {
    useMapStore.getState().setParam('minRoom', 1)
    useMapStore.getState().setParam('sens', 20)
    expect(useMapStore.getState().history).toHaveLength(0)
    expect(useMapStore.getState().params).toMatchObject({ minRoom: 1, sens: 20 })
  })
})

describe('placed monsters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMapStore.setState({ tokens: {}, width: 100, height: 80, loaded: true })
  })
  afterEach(() => vi.useRealTimers())

  it('places, moves, keeps inside the map and removes a token', () => {
    const s = useMapStore.getState()
    s.placeToken('a', { x: 10, y: 20 })
    expect(useMapStore.getState().tokens).toEqual({ a: { x: 10, y: 20 } })
    s.placeToken('a', { x: 500, y: -5 })
    expect(useMapStore.getState().tokens.a).toEqual({ x: 99, y: 0 })
    s.removeToken('a')
    expect(useMapStore.getState().tokens).toEqual({})
  })

  it('hides and shows each kind of thing on its own', () => {
    useMapStore.getState().setLayer('walls', false)
    useMapStore.getState().setLayer('lights', false)
    expect(useMapStore.getState().layers).toEqual({
      lights: false,
      players: true,
      monsters: true,
      walls: false,
    })
    useMapStore.getState().setLayer('walls', true)
    expect(useMapStore.getState().layers.walls).toBe(true)
    useMapStore.getState().setLayer('lights', true)
  })

  it('forgets a player: the token and the remembered name', () => {
    useMapStore.setState({ players: { p1: 'Ana', p2: 'Bo' } })
    const s = useMapStore.getState()
    s.placeToken('player:p1', { x: 1, y: 1 })
    s.placeToken('a', { x: 2, y: 2 })
    s.forgetPlayer('p1')
    expect(useMapStore.getState().tokens).toEqual({ a: { x: 2, y: 2 } })
    expect(useMapStore.getState().players).toEqual({ p2: 'Bo' })
  })
})
