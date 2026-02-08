import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTermSlice, type TermSlice } from './slices/termSlice'
import { createConnectionSlice, type ConnectionSlice } from './slices/connectionSlice'

export type ClientStore = TermSlice &
  ConnectionSlice & {
    isLoading: boolean
    initialize: () => Promise<void>
  }

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get, api) => ({
      isLoading: true,

      ...createTermSlice(set, get, api),
      ...createConnectionSlice(set, get, api),

      initialize: async (): Promise<void> => {
        set({ isLoading: true })
        await get().loadAvailableLanguages()
        await get().loadLanguagePack(get().language)
        set({ isLoading: false })
      },
    }),
    {
      name: 'monster-counter-client',
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
)

// Selectors
export const useClientLanguage = (): string => useClientStore((state) => state.language)
export const useClientSetLanguage = (): ((language: string) => Promise<void>) =>
  useClientStore((state) => state.setLanguage)
export const useClientAvailableLanguages = (): { key: string; name: string }[] =>
  useClientStore((state) => state.availableLanguages)
export const useClientIsLoading = (): boolean => useClientStore((state) => state.isLoading)
export const useClientConnectionStatus = (): ConnectionSlice['connectionStatus'] =>
  useClientStore((state) => state.connectionStatus)
export const useClientConnectionError = (): string | null => useClientStore((state) => state.error)
export const useClientEncounterData = (): ConnectionSlice['data'] =>
  useClientStore((state) => state.data)
export const useClientClientName = (): string => useClientStore((state) => state.clientName)
export const useClientSetClientName = (): ((name: string) => void) =>
  useClientStore((state) => state.setClientName)
export const useClientSetHostId = (): ((hostId: string | null) => void) =>
  useClientStore((state) => state.setHostId)
export const useClientConnectToHost = (): (() => void) =>
  useClientStore((state) => state.connectToHost)
export const useClientDisconnect = (): (() => void) => useClientStore((state) => state.disconnect)
export const useClientSendAttack = (): ((monsterId: string) => void) =>
  useClientStore((state) => state.sendAttack)

export const useClientTerm = (): ((key: string) => string) => {
  useClientStore((state) => state.language) // for rerenders on language change
  return useClientStore((state) => state.getTerm)
}
