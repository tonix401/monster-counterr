import { describe, expect, it } from 'vitest'
import {
  addEdge,
  addEllipse,
  addPolyline,
  addRect,
  dropNode,
  edgeSegments,
  emptyGraph,
  ensureBorder,
  hitEdge,
  graphFromLists,
  graphFromSegments,
  graphLists,
  hitTest,
  moveNode,
  opaqueSegments,
  removeEdge,
  removeNode,
  setEdgeClear,
  snapPoint,
  tidy,
} from './graph'
import type { Graph } from './types'

const square = (): Graph =>
  addPolyline(
    emptyGraph(),
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    true
  )

const nodeAt = (g: Graph, x: number, y: number) => g.nodes.find((n) => n.x === x && n.y === y)!

describe('building a graph', () => {
  it('shares one node between the lines that meet', () => {
    const g = square()
    expect(g.nodes).toHaveLength(4)
    expect(g.edges).toHaveLength(4)
  })

  it('joins a new line to nodes and walls already at its ends', () => {
    // from the middle of the top wall to the bottom-left corner
    const g = addPolyline(square(), [
      [50, 0],
      [0, 100],
    ])
    expect(g.nodes).toHaveLength(5) // the top wall was split at (50, 0)
    expect(g.edges).toHaveLength(6)
    expect(addEdge(g, nodeAt(g, 0, 0).id, nodeAt(g, 50, 0).id)).toBe(g) // already joined
  })

  it('does not draw a line from a node to itself or twice between a pair', () => {
    const g = square()
    const a = nodeAt(g, 0, 0).id
    expect(addEdge(g, a, a)).toBe(g)
    expect(addEdge(g, a, nodeAt(g, 100, 0).id)).toBe(g)
  })

  it('makes a rectangle from four nodes and four lines, reusing nodes it lands on', () => {
    const g = addRect(square(), 100, 0, 200, 100, 5)
    expect(g.nodes).toHaveLength(6)
    expect(g.edges).toHaveLength(7) // the shared wall is only there once
  })

  it('makes an ellipse as a ring of nodes', () => {
    const g = addEllipse(emptyGraph(), 0, 0, 400, 200, 1000, 4)
    expect(g.nodes.length).toBeGreaterThanOrEqual(12)
    expect(g.edges).toHaveLength(g.nodes.length)
  })
})

describe('snapping', () => {
  it('prefers a node, then a wall, then the free point', () => {
    const g = square()
    expect(snapPoint(g, 3, 4, 10)).toMatchObject({ kind: 'node', x: 0, y: 0 })
    expect(snapPoint(g, 50, 4, 10)).toMatchObject({ kind: 'edge', x: 50, y: 0 })
    expect(snapPoint(g, 50, 50, 10)).toMatchObject({ kind: 'free', x: 50, y: 50 })
  })

  it('finds the node before the wall when both are in reach', () => {
    const g = square()
    expect(hitTest(g, 2, 3, 10)?.kind).toBe('node')
    expect(hitTest(g, 50, 3, 10)?.kind).toBe('edge')
    expect(hitTest(g, 50, 50, 10)).toBeNull()
  })
})

describe('moving and joining nodes', () => {
  it('drags every wall on the node along', () => {
    const g = square()
    const c = nodeAt(g, 100, 100)
    const moved = moveNode(g, c.id, 150, 120)
    const segs = edgeSegments(moved)
    expect(
      segs.filter((s) => (s.x1 === 150 && s.y1 === 120) || (s.x2 === 150 && s.y2 === 120))
    ).toHaveLength(2)
    expect(g.nodes.find((n) => n.id === c.id)).toMatchObject({ x: 100, y: 100 }) // the old graph is untouched
  })

  it('joins a node let go on top of another, dropping the line between them', () => {
    const g = square()
    const a = nodeAt(g, 0, 0)
    const b = nodeAt(g, 100, 0)
    const out = dropNode(moveNode(g, a.id, 97, 2), a.id, 8)
    expect(out.id).toBe(b.id)
    expect(out.g.nodes).toHaveLength(3)
    expect(out.g.edges).toHaveLength(3) // the wall between them became a point
  })

  it('leaves a node alone when nothing is close', () => {
    const g = moveNode(square(), 1, 50, 50)
    expect(dropNode(g, 1, 8).g).toBe(g)
  })
})

describe('removing', () => {
  it('turns a node between two lines into one line', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [50, 0],
      [100, 0],
    ])
    const out = removeNode(g, nodeAt(g, 50, 0).id)
    expect(out.nodes).toHaveLength(2)
    expect(edgeSegments(out)).toEqual([{ x1: 0, y1: 0, x2: 100, y2: 0 }])
  })

  it('removes a node with other numbers of lines together with its lines', () => {
    const g = addPolyline(square(), [
      [50, 0],
      [0, 100],
    ])
    const corner = nodeAt(g, 0, 100) // three lines meet here now
    const out = removeNode(g, corner.id)
    expect(out.edges).toHaveLength(3)
    expect(out.nodes.find((n) => n.id === corner.id)).toBeUndefined()
  })

  it('does not dissolve a node when its neighbours are already joined', () => {
    const tri = addPolyline(
      emptyGraph(),
      [
        [0, 0],
        [100, 0],
        [50, 80],
      ],
      true
    )
    const out = removeNode(tri, nodeAt(tri, 50, 80).id)
    expect(out.edges).toHaveLength(1)
    expect(out.nodes).toHaveLength(2)
  })

  it('drops the nodes a removed line leaves alone', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 0],
    ])
    const out = removeEdge(g, g.edges[0].id)
    expect(out.nodes).toHaveLength(0)
  })
})

describe('graphFromSegments', () => {
  const M = 1000
  const tol = M * 0.012

  it('turns ends that nearly meet into one node', () => {
    const g = graphFromSegments(
      [
        { x1: 0, y1: 0, x2: 500, y2: 0 },
        { x1: 500 + tol / 2, y1: tol / 2, x2: 500, y2: 400 },
      ],
      M
    )
    expect(g.nodes).toHaveLength(3)
    expect(g.edges).toHaveLength(2)
  })

  it('cuts a wall where another one ends on it', () => {
    const g = graphFromSegments(
      [
        { x1: 0, y1: 0, x2: 800, y2: 0 },
        { x1: 400, y1: tol / 2, x2: 400, y2: 300 },
      ],
      M
    )
    expect(g.nodes).toHaveLength(4)
    expect(g.edges).toHaveLength(3)
    const top = g.nodes.find((n) => Math.abs(n.x - 400) < tol && Math.abs(n.y) < tol)!
    expect(g.edges.filter((e) => e.a === top.id || e.b === top.id)).toHaveLength(3)
  })

  it('keeps far apart ends apart and drops repeated walls', () => {
    const g = graphFromSegments(
      [
        { x1: 0, y1: 0, x2: 500, y2: 0 },
        { x1: 500, y1: 0, x2: 0, y2: 0 },
        { x1: 0, y1: 100, x2: 500, y2: 100 },
      ],
      M
    )
    expect(g.nodes).toHaveLength(4)
    expect(g.edges).toHaveLength(2)
  })
})

describe('file lists', () => {
  it('round-trips through points and pairs, skipping bad pairs and unused points', () => {
    const g = square()
    const { nodes, edges } = graphLists(g)
    const back = graphFromLists(nodes, edges)
    expect(edgeSegments(back)).toEqual(edgeSegments(g))
    const odd = graphFromLists(
      [
        [0, 0],
        [10, 0],
        [99, 99],
      ],
      [
        [0, 1],
        [1, 0],
        [0, 0],
        [0, 5],
      ]
    )
    expect(odd.edges).toHaveLength(1)
    expect(odd.nodes).toHaveLength(2)
  })
})

describe('translucent walls', () => {
  const line = (clear: boolean): Graph =>
    addPolyline(
      emptyGraph(),
      [
        [0, 0],
        [100, 0],
      ],
      false,
      0,
      clear
    )

  it('are walls for the file and the lists, but not for light', () => {
    const g = line(true)
    expect(g.edges[0].clear).toBe(true)
    expect(edgeSegments(g)).toHaveLength(1)
    expect(opaqueSegments(g)).toHaveLength(0)
    expect(opaqueSegments(line(false))).toHaveLength(1)
    const { nodes, edges } = graphLists(g)
    expect(edges).toEqual([[0, 1, 1]])
    expect(graphFromLists(nodes, edges).edges[0].clear).toBe(true)
    expect(graphLists(line(false)).edges).toEqual([[0, 1]])
  })

  it('can be drawn over a wall, switched, and keep their kind when split', () => {
    const g = line(false)
    expect(addEdge(g, 1, 2, true).edges[0].clear).toBe(true)
    expect(addEdge(line(true), 1, 2, false).edges[0].clear).toBeUndefined()
    expect(setEdgeClear(g, g.edges[0].id, true).edges[0].clear).toBe(true)
    const t = line(true)
    const cut = addPolyline(
      t,
      [
        [50, -20],
        [50, 0],
      ],
      false,
      0
    )
    expect(cut.edges.filter((e) => e.clear)).toHaveLength(2)
  })

  it('are never part of the border', () => {
    const g = ensureBorder(
      addEdge(
        addPolyline(
          emptyGraph(),
          [
            [0, 0],
            [100, 0],
          ],
          false,
          0,
          true
        ),
        1,
        2,
        true
      ),
      100,
      80
    )
    expect(g.edges.filter((e) => e.border).every((e) => !e.clear)).toBe(true)
  })
})

describe('tidy', () => {
  it('removes a tiny stub sticking out of a junction', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 0],
      [200, 0],
    ])
    const stub = addPolyline(g, [
      [100, 0],
      [100, 4],
    ])
    expect(stub.edges).toHaveLength(3)
    const out = tidy(stub, 5, [nodeAt(stub, 100, 0).id])
    expect(out.edges).toHaveLength(2)
    expect(out.nodes).toHaveLength(3)
  })

  it('keeps a stub that is longer than the reach', () => {
    const g = addPolyline(
      addPolyline(emptyGraph(), [
        [0, 0],
        [100, 0],
        [200, 0],
      ]),
      [
        [100, 0],
        [100, 40],
      ]
    )
    expect(tidy(g, 5)).toBe(g)
  })

  it('straightens a node that two nearly straight walls meet in', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 0.5],
      [200, 0],
    ])
    const out = tidy(g, 5)
    expect(nodeAt(out, 100, 0)).toBeDefined()
  })

  it('does not straighten a real corner', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 30],
      [200, 0],
    ])
    expect(tidy(g, 5)).toBe(g)
  })

  it('collapses a kink: a wall shorter than the reach', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 0],
      [100, 2],
      [200, 2],
    ])
    const out = tidy(g, 5)
    expect(out.nodes).toHaveLength(3)
  })

  it('makes a loose end that is almost level, level', () => {
    const g = addPolyline(emptyGraph(), [
      [0, 0],
      [100, 4],
    ])
    expect(edgeSegments(tidy(g, 5))[0]).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0 })
  })
})

describe('the invisible border', () => {
  const bordered = (): Graph => ensureBorder(emptyGraph(), 200, 100)

  it('is four corners and four walls, and is not made twice', () => {
    const g = bordered()
    expect(g.nodes).toHaveLength(4)
    expect(g.edges).toHaveLength(4)
    expect(g.edges.every((e) => e.border)).toBe(true)
    expect(ensureBorder(g, 200, 100)).toBe(g)
    expect(edgeSegments(g, false)).toHaveLength(0)
  })

  it('is snapped to by lines, which split it', () => {
    const g = addPolyline(bordered(), [
      [100, 0.5],
      [100, 50],
    ])
    expect(snapPoint(bordered(), 100, 4, 10)).toMatchObject({ kind: 'edge', y: 0 })
    const top = g.nodes.find((n) => n.x === 100 && n.y === 0)!
    expect(top.border).toBe(true)
    expect(g.edges.filter((e) => e.border)).toHaveLength(5)
  })

  it('can not be picked, erased or moved', () => {
    const g = bordered()
    expect(hitEdge(g, 100, 1, 10)).toBeNull()
    expect(hitTest(g, 100, 1, 10)).toBeNull()
    expect(removeEdge(g, g.edges[0].id)).toBe(g)
    expect(removeNode(g, g.nodes[0].id)).toBe(g)
    expect(moveNode(g, g.nodes[0].id, 30, 30)).toBe(g)
  })

  it('joins back into one wall when the last line leaves it', () => {
    const g = addPolyline(bordered(), [
      [100, 0],
      [100, 50],
    ])
    const line = g.edges.find((e) => !e.border)!
    const out = removeEdge(g, line.id)
    expect(out.nodes).toHaveLength(4)
    expect(out.edges).toHaveLength(4)
  })

  it('takes in the nodes of a saved or detected graph that lie on a side', () => {
    const g = ensureBorder(
      graphFromLists(
        [
          [100, 0.4],
          [100, 60],
        ],
        [[0, 1]]
      ),
      200,
      100
    )
    expect(g.nodes).toHaveLength(6)
    expect(g.edges.filter((e) => e.border)).toHaveLength(5)
    expect(g.nodes.find((n) => n.x === 100 && n.y === 0)?.border).toBe(true)
  })

  it('is not tidied away', () => {
    const g = addPolyline(bordered(), [
      [100, 0],
      [100, 50],
    ])
    expect(tidy(g, 5)).toBe(g)
  })
})
