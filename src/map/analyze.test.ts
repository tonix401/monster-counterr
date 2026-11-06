import { describe, expect, it } from 'vitest'
import { Analyzer, buildRooms, rasterizeWalls } from './analyze'
import type { WallSegment } from './types'

const W = 400
const H = 300

/** A house outline with one dividing wall: two rooms side by side, 40px of outside around them */
const house: WallSegment[] = [
  { x1: 40, y1: 40, x2: 360, y2: 40 },
  { x1: 40, y1: 260, x2: 360, y2: 260 },
  { x1: 40, y1: 40, x2: 40, y2: 260 },
  { x1: 360, y1: 40, x2: 360, y2: 260 },
  { x1: 200, y1: 40, x2: 200, y2: 260 },
]

const interiorRooms = (rooms: ReturnType<typeof buildRooms>['rooms']) =>
  rooms.filter((r) => r && r.alive && !r.ext)

describe('rasterizeWalls + buildRooms', () => {
  it('finds one room per enclosed area and treats the outside as exterior', () => {
    const { own, rooms } = buildRooms(rasterizeWalls(W, H, house), W, H, 0.2)
    expect(interiorRooms(rooms)).toHaveLength(2)
    expect(own[150 * W + 100]).not.toBe(own[150 * W + 300])
    expect(rooms[own[5 * W + 5]]!.ext).toBe(true)
  })

  it('joins two rooms when a doorway is left out of the dividing wall', () => {
    const doorway = house
      .filter((w) => w.x1 !== 200)
      .concat({ x1: 200, y1: 40, x2: 200, y2: 130 }, { x1: 200, y1: 170, x2: 200, y2: 260 })
    const { own, rooms } = buildRooms(rasterizeWalls(W, H, doorway), W, H, 0.2)
    expect(interiorRooms(rooms)).toHaveLength(1)
    expect(own[150 * W + 100]).toBe(own[150 * W + 300])
  })

  it('splits a room when a wall is drawn across it', () => {
    const wall: WallSegment = { x1: 40, y1: 150, x2: 200, y2: 150 }
    const { rooms } = buildRooms(rasterizeWalls(W, H, house.concat(wall)), W, H, 0.2)
    expect(interiorRooms(rooms)).toHaveLength(3)
  })

  it('drops pockets smaller than the minimum room size', () => {
    const closet: WallSegment[] = [
      { x1: 60, y1: 60, x2: 80, y2: 60 },
      { x1: 60, y1: 80, x2: 80, y2: 80 },
      { x1: 60, y1: 60, x2: 60, y2: 80 },
      { x1: 80, y1: 60, x2: 80, y2: 80 },
    ]
    const { rooms } = buildRooms(rasterizeWalls(W, H, house.concat(closet)), W, H, 0.5)
    expect(interiorRooms(rooms)).toHaveLength(2)
  })

  it('gives each room a sample pixel that lies inside it', () => {
    const { own, rooms } = buildRooms(rasterizeWalls(W, H, house), W, H, 0.2)
    for (const r of interiorRooms(rooms)) expect(own[r!.sample]).toBe(r!.id)
  })
})

describe('Analyzer', () => {
  /** Dark floor with the house drawn as bright 5px bands, the way a battle map shows walls */
  function drawHouse(): Float32Array {
    const g = new Float32Array(W * H).fill(60)
    for (const s of house)
      for (let y = Math.min(s.y1, s.y2) - 2; y <= Math.max(s.y1, s.y2) + 2; y++)
        for (let x = Math.min(s.x1, s.x2) - 2; x <= Math.max(s.x1, s.x2) + 2; x++)
          g[y * W + x] = 230
    return g
  }

  it('detects straight walls in an image, and builds the rooms from the walls it is given', () => {
    const a = new Analyzer()
    a.load(drawHouse(), W, H)
    const found = a.detect({ sensitivity: 40 - 70 * 0.32, minLen: 0.06, gap: 0.065 })
    expect(found.length).toBeGreaterThanOrEqual(5)
    expect(interiorRooms(a.run({ segments: found, minRoom: 0.2 }).rooms)).toHaveLength(2)
    expect(interiorRooms(a.run({ segments: [], minRoom: 0.2 }).rooms)).toHaveLength(0)
  })
})
