/**
 * Returns all objects sorted by fuzzy match quality.
 * Case-insensitive, ranks by match quality (consecutive, start-of-word, minimal gaps).
 * @param items List of { value, label } objects to sort
 * @param query Search query
 */
export function fuzzySort(
  items: { value: string; label: string }[],
  query: string
): { value: string; label: string }[] {
  if (!query) return items.sort((a, b) => a.label.replaceAll(/[^a-z0-9]+/gi, '').localeCompare(b.label.replaceAll(/[^a-z0-9]+/gi, '')))
  const q = query.toLowerCase()
  function score(label: string): number | null {
    const s = label.toLowerCase()
    let lastIdx = -1
    let consecutive = 0
    let startBonus = 0
    let gapSum = 0
    let found = true
    for (let j = 0; j < q.length; j++) {
      const c = q[j]
      const idx = s.indexOf(c, lastIdx + 1)
      if (idx === -1) {
        found = false
        break
      }
      if (idx === lastIdx + 1) consecutive++
      if (idx === 0 || s[idx - 1] === ' ') startBonus++
      gapSum += idx - lastIdx - 1
      lastIdx = idx
    }
    if (!found) return null
    return 100 * consecutive + 10 * startBonus - gapSum
  }
  const scored = items
    .map((obj, index) => ({ obj, score: score(obj.label), index }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.index - b.index
      if (a.score === null) return 1
      if (b.score === null) return -1
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
  return scored.map((x) => x.obj)
}
