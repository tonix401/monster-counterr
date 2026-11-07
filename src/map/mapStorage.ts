import type { MapMeta } from './mapLibrary'

const DB_NAME = 'monster-counterr-map'
const KV = 'kv'
/** The list of maps: small records, so showing the list never loads a picture */
const MAPS = 'maps'
/** The text of each map (picture, walls, fog), keyed by the same id */
const DATA = 'data'
const CURRENT = 'current'
const CURRENT_ID = 'currentId'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
      if (!db.objectStoreNames.contains(MAPS)) db.createObjectStore(MAPS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Runs `fn` on the named stores in one transaction and resolves with its result once it commits */
async function run<T>(
  stores: string[],
  mode: IDBTransactionMode,
  fn: (s: Record<string, IDBObjectStore>) => IDBRequest<T>
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      const req = fn(Object.fromEntries(stores.map((n) => [n, tx.objectStore(n)])))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/**
 * Maps live in IndexedDB, not localStorage: a map image is megabytes and would blow the ~5 MB
 * localStorage quota the saved encounters share.
 */
export async function listMaps(): Promise<MapMeta[]> {
  try {
    const all = await run<MapMeta[]>([MAPS], 'readonly', (s) => s[MAPS].getAll())
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export async function loadMap(id: string): Promise<string | null> {
  try {
    const v = await run<unknown>([DATA], 'readonly', (s) => s[DATA].get(id))
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

/** Stores a map's record and text together; returns false when the browser refused (quota) */
export async function saveMap(meta: MapMeta, text: string): Promise<boolean> {
  try {
    await run([MAPS, DATA], 'readwrite', (s) => {
      s[DATA].put(text, meta.id)
      return s[MAPS].put(meta)
    })
    return true
  } catch (error) {
    console.error('Could not save the map:', error)
    return false
  }
}

/** Changes only the record, for a rename of a map that is not open */
export async function saveMeta(meta: MapMeta): Promise<void> {
  try {
    await run([MAPS], 'readwrite', (s) => s[MAPS].put(meta))
  } catch (error) {
    console.error('Could not rename the map:', error)
  }
}

export async function removeMap(id: string): Promise<void> {
  try {
    await run([MAPS, DATA], 'readwrite', (s) => {
      s[DATA].delete(id)
      return s[MAPS].delete(id)
    })
  } catch (error) {
    console.error('Could not delete the map:', error)
  }
}

/** The id of the map that was open last, so a reload comes back to it */
export async function getCurrentId(): Promise<string | null> {
  try {
    const v = await run<unknown>([KV], 'readonly', (s) => s[KV].get(CURRENT_ID))
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

export async function setCurrentId(id: string | null): Promise<void> {
  try {
    if (id === null) await run([KV], 'readwrite', (s) => s[KV].delete(CURRENT_ID))
    else await run([KV], 'readwrite', (s) => s[KV].put(id, CURRENT_ID))
  } catch (error) {
    console.error('Could not remember the open map:', error)
  }
}

/** The single map older versions kept: returned once, then forgotten, so the library takes it over */
export async function takeLegacyMap(): Promise<string | null> {
  try {
    const v = await run<unknown>([KV], 'readonly', (s) => s[KV].get(CURRENT))
    if (typeof v !== 'string') return null
    await run([KV], 'readwrite', (s) => s[KV].delete(CURRENT))
    return v
  } catch {
    return null
  }
}
