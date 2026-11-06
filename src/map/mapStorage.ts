const DB_NAME = 'monster-counterr-map'
const STORE = 'kv'
const KEY = 'current'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/** The current map lives in IndexedDB, not localStorage: a map image is megabytes and would blow the ~5 MB localStorage quota the saved encounters share. */
export async function saveMapText(text: string | null): Promise<void> {
  try {
    if (text === null) await withStore('readwrite', (s) => s.delete(KEY))
    else await withStore('readwrite', (s) => s.put(text, KEY))
  } catch (error) {
    console.error('Could not save the map:', error)
  }
}

export async function loadMapText(): Promise<string | null> {
  try {
    const v = await withStore<unknown>('readonly', (s) => s.get(KEY))
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}
