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

  it('round-trips polygons and drops ones with too few corners', () => {
    const poly = {
      type: 'poly' as const,
      pts: [
        [1.04, 2],
        [30, 2],
        [30, 20],
      ] as [number, number][],
    }
    const back = parseFogMap(serializeFogMap({ ...doc, walls: [poly] }))!
    expect(back.walls).toEqual([
      {
        type: 'poly',
        pts: [
          [1, 2],
          [30, 2],
          [30, 20],
        ],
      },
    ])
    const bad = parseFogMap(
      JSON.stringify({
        format: 'fog_map',
        image: 'x',
        walls: [
          {
            type: 'poly',
            pts: [
              [1, 2],
              [3, 4],
            ],
          },
        ],
      })
    )!
    expect(bad.walls).toEqual([])
  })

  it('loads a triangle from an older file as a polygon', () => {
    const back = parseFogMap(
      JSON.stringify({
        format: 'fog_map',
        image: 'x',
        walls: [{ type: 'shape', kind: 'tri', x1: 10, y1: 10, x2: 50, y2: 30 }],
      })
    )!
    expect(back.walls).toEqual([
      {
        type: 'poly',
        pts: [
          [30, 10],
          [50, 30],
          [10, 30],
        ],
      },
    ])
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
