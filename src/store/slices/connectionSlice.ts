import type { StateCreator } from 'zustand'
import Peer, { type DataConnection } from 'peerjs'
import type { MonsterSlice } from './monsterSlice'

export type ConnectionSliceState = {
  peer: Peer | null
  peerId: string | null
  connections: DataConnection[]
  isConnecting: boolean
}

export type ConnectionSliceActions = {
  initializeHost: () => void
  broadcastMonsters: () => void
  disconnectAll: () => void
}

export type ConnectionSlice = ConnectionSliceState & ConnectionSliceActions

export const createConnectionSlice: StateCreator<
  ConnectionSlice & MonsterSlice,
  [],
  [],
  ConnectionSlice
> = (set, get) => ({
  peer: null,
  peerId: null,
  connections: [],
  isConnecting: false,

  initializeHost: () => {
    if (get().peer) return

    set({ isConnecting: true })
    const peer = new Peer()

    peer.on('open', (id) => {
      set({ peerId: id, isConnecting: false })
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        set((state) => ({
          connections: [...state.connections, conn],
        }))
        // Send initial state
        get().broadcastMonsters()
      })

      conn.on('close', () => {
        set((state) => ({
          connections: state.connections.filter((c) => c.peer !== conn.peer),
        }))
      })

      conn.on('error', () => {
        set((state) => ({
          connections: state.connections.filter((c) => c.peer !== conn.peer),
        }))
      })
    })

    peer.on('error', (err) => {
      console.error('PeerJS error:', err)
      set({ isConnecting: false })
    })

    set({ peer })
  },

  broadcastMonsters: () => {
    const { monsters, connections } = get()
    if (connections.length === 0) return

    const data = {
      enemies: monsters.map((m) => ({
        name: m.name + (m.number > 0 ? ` ${m.number}` : ''),
        health: Math.round((m.hp / m.maxhp) * 100),
        conditions: m.conditions,
      })),
    }

    connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data)
      }
    })
  },

  disconnectAll: () => {
    const { peer, connections } = get()
    connections.forEach((conn) => conn.close())
    peer?.destroy()
    set({ peer: null, peerId: null, connections: [] })
  },
})
