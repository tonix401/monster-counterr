import { describe, expect, it } from 'vitest'
import { parseFogMap, serializeFogMap } from './fogMapFile'

describe('fog_map files', () => {
  const doc = {
    name: 'Inn',
    width: 100,
    height: 80,
    view: 'blueprint' as const,
    walls: [
      { type: 'wall' as const, x1: 1.04, y1: 2, x2: 30, y2: 2 },
      {
        type: 'erase' as const,
        w: 10,
        pts: [[5, 5] as [number, number], [6, 7] as [number, number]],
      },
    ],
    fog: [[10, 12]] as [number, number][],
    image: 'data:image/jpeg;base64,AAAA',
  }

  it('round-trips, rounding coordinates to a tenth', () => {
    const back = parseFogMap(serializeFogMap(doc))!
    expect(back.name).toBe('Inn')
    expect(back.view).toBe('blueprint')
    expect(back.walls[0]).toEqual({ type: 'wall', x1: 1, y1: 2, x2: 30, y2: 2 })
    expect(back.walls[1]).toEqual(doc.walls[1])
    expect(back.fog).toEqual([[10, 12]])
    expect(back.image).toBe(doc.image)
  })

  it('rejects anything that is not a fog_map', () => {
    expect(parseFogMap('not json')).toBeNull()
    expect(parseFogMap('{"format":"other","image":"x"}')).toBeNull()
    expect(parseFogMap('{"format":"fog_map"}')).toBeNull()
    expect(parseFogMap('null')).toBeNull()
  })

  it('drops malformed walls and falls back to defaults', () => {
    const f = parseFogMap(
      JSON.stringify({
        format: 'fog_map',
        image: 'x',
        view: 'nope',
        walls: [{ type: 'wall', x1: 'a' }, null, { type: 'erase', pts: [] }],
        fog: [[1], 'x'],
      })
    )!
    expect(f.walls).toEqual([])
    expect(f.fog).toEqual([])
    expect(f.view).toBe('lines')
    expect(f.name).toBe('map')
  })
})
