import { describe, expect, it } from 'vitest'
import { addPolyline, emptyGraph, ensureBorder } from './graph'
import { analyzeGraph } from './rooms'
import type { Graph } from './types'

const W = 400
const H = 300

const rect = (g: Graph, x1: number, y1: number, x2: number, y2: number): Graph =>
  addPolyline(
    g,
    [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ],
    true
  )

/** A house outline with one dividing wall: two rooms side by side, 40px of outside around them */
const house = (): Graph =>
  addPolyline(rect(emptyGraph(), 40, 40, 360, 260), [
    [200, 40],
    [200, 260],
  ])

const inner = (a: ReturnType<typeof analyzeGraph>) => a.rooms.filter((r) => r && r.alive && !r.ext)

describe('analyzeGraph', () => {
  it('finds one room per enclosed area and treats the outside as exterior', () => {
    const a = analyzeGraph(house(), W, H, 0.2)
    expect(inner(a)).toHaveLength(2)
    expect(a.own[150 * W + 100]).not.toBe(a.own[150 * W + 300])
    expect(a.rooms[a.own[5 * W + 5]]!.ext).toBe(true)
  })

  it('has no rooms without walls', () => {
    const a = analyzeGraph(emptyGraph(), W, H, 0.2)
    expect(inner(a)).toHaveLength(0)
    expect(a.rooms[a.own[0]]!.ext).toBe(true)
  })

  it('joins two rooms when the dividing wall leaves a doorway', () => {
    let g = rect(emptyGraph(), 40, 40, 360, 260)
    g = addPolyline(g, [
      [200, 40],
      [200, 130],
    ])
    g = addPolyline(g, [
      [200, 170],
      [200, 260],
    ])
    const a = analyzeGraph(g, W, H, 0.2)
    expect(inner(a)).toHaveLength(1)
    expect(a.own[150 * W + 100]).toBe(a.own[150 * W + 300])
  })

  it('splits a room when a wall is drawn across it', () => {
    const g = addPolyline(house(), [
      [40, 150],
      [200, 150],
    ])
    expect(inner(analyzeGraph(g, W, H, 0.2))).toHaveLength(3)
  })

  it('splits rooms where two walls cross without a shared node', () => {
    const g = rect(emptyGraph(), 40, 40, 360, 260)
    const cross = addPolyline(
      addPolyline(g, [
        [200, 40],
        [200, 260],
      ]),
      [
        [40, 150],
        [360, 150],
      ]
    )
    expect(cross.nodes).toHaveLength(8) // the two walls pass each other without meeting in a node
    expect(inner(analyzeGraph(cross, W, H, 0.05))).toHaveLength(4)
  })

  it('drops pockets smaller than the minimum room size', () => {
    const g = rect(house(), 60, 60, 80, 80)
    // the closet inside is folded into the room around it, so only the two rooms remain
    expect(inner(analyzeGraph(g, W, H, 0.5))).toHaveLength(2)
  })

  it('gives each room a sample pixel that lies inside it', () => {
    const a = analyzeGraph(house(), W, H, 0.2)
    for (const r of inner(a)) expect(a.own[r!.sample]).toBe(r!.id)
  })

  it('keeps a room around a free-standing island of walls', () => {
    const g = rect(rect(emptyGraph(), 40, 40, 360, 260), 150, 100, 250, 200)
    const a = analyzeGraph(g, W, H, 0.05)
    expect(inner(a)).toHaveLength(1) // the island folds into the room around it
    expect(a.own[70 * W + 70]).toBe(a.own[150 * W + 200])
  })
})

describe('analyzeGraph with the border', () => {
  const outdoors = (g: Graph) => ensureBorder(g, W, H)

  it('makes the outside one room around the buildings', () => {
    const a = analyzeGraph(outdoors(house()), W, H, 0.2)
    expect(inner(a)).toHaveLength(3)
    expect(a.own[5 * W + 5]).toBe(a.own[290 * W + 395])
    expect(a.own[5 * W + 5]).not.toBe(a.own[150 * W + 100])
  })

  it('splits the outside where a building is joined to the border twice', () => {
    const g = addPolyline(
      addPolyline(outdoors(house()), [
        [200, 40],
        [200, 0],
      ]),
      [
        [200, 260],
        [200, 300],
      ]
    )
    const a = analyzeGraph(g, W, H, 0.2)
    expect(inner(a)).toHaveLength(4)
    expect(a.own[150 * W + 20]).not.toBe(a.own[150 * W + 380])
  })
})
