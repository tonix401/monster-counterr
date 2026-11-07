import type { StateCreator, StoreMutatorIdentifier } from 'zustand'

interface TemporalState<T = unknown> {
  past: T[]
  future: T[]
}

interface TemporalActions {
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
}

type Temporal = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>,
  options?: TemporalOptions<T>
) => StateCreator<T & TemporalState<T> & TemporalActions, Mps, Mcs>

interface TemporalOptions<T> {
  limit?: number
  equality?: (a: Partial<T>, b: Partial<T>) => boolean
  partialize?: (state: T & TemporalState<Partial<T>> & TemporalActions) => Partial<T>
}

/** True when both objects have the same own keys and every value is Object.is-equal. */
const shallowEqual = (a: object, b: object): boolean => {
  const recordA = a as Record<string, unknown>
  const recordB = b as Record<string, unknown>
  const keys = Object.keys(recordA)
  return (
    keys.length === Object.keys(recordB).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(recordB, key) && Object.is(recordA[key], recordB[key])
    )
  )
}

/** zustand's set accepts a value, a partial, or an updater, plus an optional replace flag. */
type SetPartial<S> = S | Partial<S> | ((state: S) => S | Partial<S>)

const temporalImpl =
  <T>(
    config: StateCreator<T, [], []>,
    options: TemporalOptions<T> = {}
  ): StateCreator<T & TemporalState<T> & TemporalActions, [], []> =>
  (set, get, api) => {
    const {
      limit = 50,
      // Cheap shallow check first; serialise only when some value differs.
      equality = (a, b) =>
        (typeof a === 'object' &&
          a !== null &&
          typeof b === 'object' &&
          b !== null &&
          shallowEqual(a, b)) ||
        JSON.stringify(a) === JSON.stringify(b),
      partialize = (state) => state,
    } = options

    type T = ReturnType<typeof config>
    type Full = T & TemporalState<T> & TemporalActions

    // Same store as `set`, with a single signature so the replace flag can be forwarded.
    const setState = set as (partial: SetPartial<Full>, replace?: boolean) => void
    // History entries are partialize() output, so they are Partial<T> rather than T.
    const write = (patch: object) => setState(patch as Partial<Full>)

    const initialState = config(
      (partial: SetPartial<T>, replace?: boolean) => {
        const currentState = get()
        setState(partial as SetPartial<Full>, replace)
        const newState = get()

        // Only add to history if the state actually changed
        const current = partialize(currentState)
        const next = partialize(newState)

        if (!equality(current, next)) {
          const past = [...currentState.past, current].slice(-limit)
          write({ past, future: [] })
        }
      },
      get,
      api
    )

    return {
      ...initialState,
      past: [],
      future: [],

      undo: () => {
        const { past, future } = get()
        if (past.length === 0) return

        const previous = past[past.length - 1]
        const newPast = past.slice(0, past.length - 1)
        const current = partialize(get())

        write({
          ...previous,
          past: newPast,
          future: [current, ...future],
        })
      },

      redo: () => {
        const { past, future } = get()
        if (future.length === 0) return

        const next = future[0]
        const newFuture = future.slice(1)
        const current = partialize(get())

        write({
          ...next,
          past: [...past, current],
          future: newFuture,
        })
      },

      canUndo: () => {
        return get().past.length > 0
      },

      canRedo: () => {
        return get().future.length > 0
      },

      clearHistory: () => {
        write({ past: [], future: [] })
      },
    }
  }

// The impl is fixed to the default mutator tuples; `Temporal` widens them for callers.
export const temporal = temporalImpl as unknown as Temporal

export type { TemporalState, TemporalActions, TemporalOptions }
