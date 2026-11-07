/** What the library keeps about a map besides its file text, so the list loads without the pictures */
export interface MapMeta {
  id: string
  name: string
  /** Milliseconds since the epoch of the last save */
  updatedAt: number
  width: number
  height: number
  /** A small picture of the map as a data URL, or '' when there is none */
  thumb: string
}

/** A map as it travels in a save file: its record and the `.fog_map` text with the picture */
export interface SavedMap extends MapMeta {
  data: string
}

export const newMapId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** `name`, or `name (2)`, `name (3)` ... when another map already has it; case does not matter */
export function uniqueName(name: string, taken: string[]): string {
  const base = name.trim() || 'map'
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  if (!used.has(base.toLowerCase())) return base
  for (let i = 2; ; i++) {
    const next = `${base} (${i})`
    if (!used.has(next.toLowerCase())) return next
  }
}
