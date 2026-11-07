/** [position across, start along, end along, ridge coverage 0..1, number of edges merged into it] */
export type Line = [number, number, number, number, number, number]

const overlap = (p: Line, q: Line): number => Math.min(p[2], q[2]) - Math.max(p[1], q[1])

/**
 * A thick wall shows up as two parallel edge lines. Replaces every such pair (close together,
 * mostly overlapping) by one line through the middle.
 */
export function mergeDoubles(input: Line[], maxThick: number): Line[] {
  let ls = input.map((l) => [...l] as Line)
  for (let changed = true; changed; ) {
    changed = false
    ls.sort((p, q) => p[0] - q[0])
    outer: for (let i = 0; i < ls.length; i++) {
      for (let j = i + 1; j < ls.length; j++) {
        const d = ls[j][0] - ls[i][0]
        if (d > maxThick) break
        const p = ls[i]
        const q = ls[j]
        const ov = overlap(p, q)
        const lp = p[2] - p[1]
        const lq = q[2] - q[1]
        if (ov < 0.6 * Math.min(lp, lq)) continue
        const merged: Line = [
          (p[0] + q[0]) / 2,
          Math.min(p[1], q[1]),
          Math.max(p[2], q[2]),
          (p[3] * lp + q[3] * lq) / (lp + lq),
          p[4] + q[4],
          (p[5] * lp + q[5] * lq) / (lp + lq),
        ]
        ls = ls.filter((_, k) => k !== i && k !== j)
        ls.push(merged)
        changed = true
        break outer
      }
    }
  }
  return ls
}

/**
 * Stairs and roof shingles give a stack of three or more short parallel lines at an even pitch,
 * unlike a wall (one line, or an edge pair already merged). Drops such stacks.
 */
export function rejectStacks(ls: Line[], pitch: number, minLen: number): Line[] {
  const n = ls.length
  const parent = ls.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = Math.abs(ls[i][0] - ls[j][0])
      if (d > pitch || d < 1) continue
      const ov = overlap(ls[i], ls[j])
      if (ov > 0.4 * Math.min(ls[i][2] - ls[i][1], ls[j][2] - ls[j][1])) parent[find(i)] = find(j)
    }
  const size = new Map<number, number>()
  for (let i = 0; i < n; i++) size.set(find(i), (size.get(find(i)) ?? 0) + 1)
  return ls.filter((l, i) => (size.get(find(i)) ?? 0) < 4 || l[2] - l[1] >= minLen)
}

/**
 * A short line running right beside a longer one (a row of headboards, a bench along a wall) is
 * furniture, not a second wall: no room is thinner than `sliver`.
 */
export function dropSlivers(ls: Line[], sliver: number): Line[] {
  const len = (l: Line): number => l[2] - l[1]
  return ls.filter(
    (l) =>
      !ls.some(
        (o) =>
          o !== l &&
          len(o) > len(l) &&
          Math.abs(o[0] - l[0]) <= sliver &&
          overlap(o, l) >= 0.7 * len(l)
      )
  )
}

export function cleanLines(ls: Line[], maxThick: number, pitch: number, minLen: number): Line[] {
  return dropSlivers(mergeDoubles(rejectStacks(ls, pitch, minLen), maxThick), maxThick * 2)
}

/** Length-weighted mean brightness of the detected lines, the "typical wall" */
export function typicalBrightness(groups: Line[][]): number {
  let sum = 0
  let len = 0
  for (const g of groups)
    for (const l of g) {
      const n = l[2] - l[1]
      sum += l[5] * n
      len += n
    }
  return len > 0 ? sum / len : 0
}

/** Drops lines far dimmer than the typical wall: furniture edges, fences and shadows. */
export function dropDim(groups: Line[][], ratio: number): void {
  const ref = typicalBrightness(groups)
  for (const g of groups)
    for (let i = g.length - 1; i >= 0; i--) if (g[i][5] < ratio * ref) g.splice(i, 1)
}

/**
 * Short lines must be attached to the structure: a short free-standing stub is furniture (a
 * bed's headboard, a bench) rather than a wall. Very short ones need both ends attached,
 * medium ones one end, and a medium one that is also dim (the edge of a staircase) is dropped.
 * Checks `ls` against the crossing lines `other` (a horizontal line ends on vertical ones).
 */
export function dropLoose(
  ls: Line[],
  other: Line[],
  short: number,
  medium: number,
  tol: number,
  dimBelow: number
): void {
  const touches = (pos: number, at: number): boolean =>
    other.some((o) => Math.abs(o[0] - at) <= tol && pos >= o[1] - tol && pos <= o[2] + tol)
  for (let i = ls.length - 1; i >= 0; i--) {
    const l = ls[i]
    const len = l[2] - l[1]
    if (len >= medium) continue
    const ends = Number(touches(l[0], l[1])) + Number(touches(l[0], l[2]))
    if (ends === 0 || (len < short && ends < 2) || (ends < 2 && l[5] < dimBelow)) ls.splice(i, 1)
  }
}

/**
 * Where a wall steps sideways (a bay window, a jog in the outline) the short step across is
 * below the minimum length and goes undetected, leaving a hole. Joins the facing free ends of
 * two parallel lines that are nearly in line, returning the connecting pieces as [position
 * across, start, end] of lines running the other way.
 */
export function bridgeJogs(
  ls: Line[],
  other: Line[],
  maxStep: number,
  maxShift: number,
  tol: number
): Line[] {
  const touches = (pos: number, at: number): boolean =>
    other.some((o) => Math.abs(o[0] - at) <= tol && pos >= o[1] - tol && pos <= o[2] + tol)
  const out: Line[] = []
  for (let i = 0; i < ls.length; i++)
    for (let j = 0; j < ls.length; j++) {
      const a = ls[i]
      const b = ls[j]
      const step = Math.abs(a[0] - b[0])
      if (i === j || step < 2 || step > maxStep) continue
      if (Math.abs(a[2] - b[1]) > maxShift || touches(a[0], a[2]) || touches(b[0], b[1])) continue
      const at = (a[2] + b[1]) / 2
      out.push([at, Math.min(a[0], b[0]), Math.max(a[0], b[0]), 1, 1, a[5]])
    }
  return out
}
