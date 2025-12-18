import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

interface TemporalState<T = any> {
  past: T[];
  future: T[];
}

interface TemporalActions {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

type Temporal = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<T, Mps, Mcs>,
  options?: TemporalOptions<T>
) => StateCreator<T & TemporalState<T> & TemporalActions, Mps, Mcs>;

interface TemporalOptions<T> {
  limit?: number;
  equality?: (a: Partial<T>, b: Partial<T>) => boolean;
  partialize?: (state: T & TemporalState<Partial<T>> & TemporalActions) => Partial<T>;
}

type TemporalImpl = <T>(
  config: StateCreator<T, [], []>,
  options?: TemporalOptions<T>
) => StateCreator<T & TemporalState<T> & TemporalActions, [], []>;

const temporalImpl: TemporalImpl = (config, options = {}) => (set, get, api) => {
  const { limit = 50, equality = (a, b) => JSON.stringify(a) === JSON.stringify(b), partialize = (state: any) => state } = options;

  type T = ReturnType<typeof config>;
  type TFull = T & TemporalState<any> & TemporalActions;

  const initialState = config(
    (args: any) => {
      const currentState = get();
      set(args as any);
      const newState = get();

      // Only add to history if the state actually changed
      const current = partialize(currentState);
      const next = partialize(newState);
      
      if (!equality(current, next)) {
        const past = [...currentState.past, current];
        if (past.length > limit) {
          past.shift();
        }
        set({ past, future: [] } as Partial<TFull>);
      }
    },
    get,
    api
  );

  return {
    ...initialState,
    past: [],
    future: [],

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const current = partialize(get());

      set({
        ...previous,
        past: newPast,
        future: [current, ...future],
      } as Partial<TFull>);
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const current = partialize(get());

      set({
        ...next,
        past: [...past, current],
        future: newFuture,
      } as Partial<TFull>);
    },

    canUndo: () => {
      return get().past.length > 0;
    },

    canRedo: () => {
      return get().future.length > 0;
    },

    clearHistory: () => {
      set({ past: [], future: [] } as Partial<TFull>);
    },
  };
};

export const temporal = temporalImpl as unknown as Temporal;

export type { TemporalState, TemporalActions, TemporalOptions };
