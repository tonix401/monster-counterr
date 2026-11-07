import { describe, expect, it } from 'vitest'
import { parseFogMap, serializeFogMap } from './fogMapFile'

const base = {
  name: 'Inn',
  width: 100,
  height: 80,
  nodes: [
    [1.04, 2],
    [30, 2],
    [30, 20],
  ] as [number, number][],
  edges: [
    [0, 1],
    [1, 2],
  ] as [number, number][],
  fog: [[10, 12]] as [number, number][],
  image: 'data:image/jpeg;base64,AAAA',
}

describe('fog_map files', () => {
  it('round-trips the nodes, the lines between them and the fog', () => {
    const back = parseFogMap(serializeFogMap(base))!
    expect(back.name).toBe('Inn')
    expect(back.nodes).toEqual(base.nodes)
    expect(back.edges).toEqual(base.edges)
    expect(back.fog).toEqual([[10, 12]])
    expect(back.image).toBe(base.image)
  })

  it('keeps placed monsters and still reads files from before they existed', () => {
    const tokens = { a: { x: 4, y: 5 } }
    expect(parseFogMap(serializeFogMap({ ...base, tokens }))!.tokens).toEqual(tokens)
    expect(parseFogMap(serializeFogMap(base))!.tokens).toBeUndefined()
    const bad = JSON.parse(serializeFogMap({ ...base, tokens }))
    bad.tokens = { ok: { x: 1, y: 2 }, nope: { x: 'a' }, worse: null }
    expect(parseFogMap(JSON.stringify(bad))!.tokens).toEqual({ ok: { x: 1, y: 2 } })
  })

  it('rejects anything that is not a version 2 fog_map', () => {
    expect(parseFogMap('not json')).toBeNull()
    expect(parseFogMap('{"format":"other","version":2,"image":"x"}')).toBeNull()
    expect(parseFogMap('{"format":"fog_map","version":2}')).toBeNull()
    expect(parseFogMap('{"format":"fog_map","image":"x","walls":[]}')).toBeNull()
    expect(parseFogMap('null')).toBeNull()
  })

  it('drops malformed nodes and lines and falls back to defaults', () => {
    const f = parseFogMap(
      JSON.stringify({
        format: 'fog_map',
        version: 2,
        image: 'x',
        nodes: [[0, 0], 'x', [5, 5], [9, 9]],
        edges: [[0, 2], [0, 1], [2, 2], [0, 7], [2.5, 0], 'x', null],
        fog: [[1], 'x'],
      })
    )!
    expect(f.edges).toEqual([[0, 2]]) // the others name a bad node, the same node twice or none
    expect(f.fog).toEqual([])
    expect(f.name).toBe('map')
  })

  it('keeps ranges and the grid, and drops bad ones', () => {
    const ok = { ranges: { 'light:a': 20 }, grid: { on: true, cell: 40 } }
    const back = parseFogMap(serializeFogMap({ ...base, ...ok }))!
    expect(back.ranges).toEqual(ok.ranges)
    expect(back.grid).toEqual(ok.grid)
    const bad = JSON.parse(serializeFogMap(base))
    bad.ranges = { a: -1, b: 'x', c: 30 }
    bad.grid = { on: true, cell: 1 }
    const f = parseFogMap(JSON.stringify(bad))!
    expect(f.ranges).toEqual({ c: 30 })
    expect(f.grid).toBeUndefined()
  })

  it('keeps the fog style, and tolerates files without one', () => {
    expect(parseFogMap(serializeFogMap({ ...base, fogStyle: 'dark' }))!.fogStyle).toBe('dark')
    expect(parseFogMap(serializeFogMap(base))!.fogStyle).toBeUndefined()
    expect(
      parseFogMap('{"format":"fog_map","version":2,"image":"x","fogStyle":"x"}')!.fogStyle
    ).toBeUndefined()
  })
})
