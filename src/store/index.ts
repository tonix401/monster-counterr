import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Monster } from "@/types/Monster";
import type { Settings } from "@/types/Settings";
import type { MonsterDetails, MonsterIndex } from "@/types/MonsterDetails";
import { createMonsterSlice } from "@/store/slices/monsterSlice";
import { createSettingsSlice } from "@/store/slices/settingsSlice";
import { createInfoSlice } from "@/store/slices/infoSlice";
import { createXpSlice } from "@/store/slices/xpSlice";
import { createDataManagementSlice } from "@/store/slices/dataManagementSlice";
import {
    temporal,
    type TemporalState,
    type TemporalActions,
} from "@/store/middleware/temporal";
import { STORAGE_KEYS, ANIMATION_DURATION } from "@/constants";

interface MonsterCounterCoreState {
    // State
    monsters: Monster[];
    monsterIndex: Record<string, MonsterIndex>;
    monsterDetails: Record<string, MonsterDetails>;
    settings: Settings;
    xp: number;
    isLoading: boolean;

    // Monster Actions
    addMonster: (name: string, hp: number, amount?: number) => Monster[];
    removeMonster: (monsterId: string) => void;
    removeDead: () => void;
    clearMonsters: () => void;
    updateMonsterHealth: (
        monsterId: string,
        amount: number,
        onDeath?: (monster: Monster) => void
    ) => void;
    addMonsterCondition: (monsterId: string, condition: string) => void;
    removeMonsterCondition: (monsterId: string, condition: string) => void;

    // Info Actions
    updateMonsterIndex: () => Promise<void>;
    addMonsterDetails: (id: string) => Promise<void>;
    getMonsterIdByName: (name: string) => string | null;
    getMonsterDetails: (id: string) => MonsterDetails | null;
    getMonsterNames: () => string[];
    isMonsterDetailsAvailable: (id: string) => boolean;

    // Settings Actions
    getSetting: (key: keyof Settings) => boolean;
    getSettingName: (key: keyof Settings) => string;
    setSetting: (key: keyof Settings, value: boolean) => void;

    // XP Actions
    updateXp: (amount: number) => void;
    resetXp: () => void;

    // Data Management Actions
    exportData: () => void;
    importData: (data: unknown) => boolean;

    // Complex Actions
    killMonster: (monsterId: string) => void;
    killAllMonsters: () => void;

    // Initialization
    initialize: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

type MonsterCounterState = MonsterCounterCoreState &
    TemporalState<any> &
    TemporalActions;

export const useMonsterStore = create<MonsterCounterState>()(
    persist(
        temporal(
            (set, get) =>
                ({
                    // Initial State
                    isLoading: false,

                    // Slices
                    ...createMonsterSlice(set, get),
                    ...createSettingsSlice(set, get),
                    ...createInfoSlice(set, get),
                    ...createXpSlice(set),
                    ...createDataManagementSlice(set, get),

                    // Complex Actions (combine multiple slices)
                    killMonster: (monsterId: string) => {
                        const state = get();
                        const monster = state.monsters.find(
                            (m: Monster) => m.id === monsterId
                        );
                        if (!monster) return;

                        const onDeath = (deadMonster: Monster) => {
                            const details =
                                state.monsterDetails[deadMonster.detailIndex];
                            if (details) {
                                state.updateXp(details.xp);
                            }
                        };

                        state.updateMonsterHealth(
                            monsterId,
                            -monster.hp,
                            onDeath
                        );
                    },

                    killAllMonsters: () => {
                        const state = get();
                        const monsters = state.monsters;
                        const killMonster = state.killMonster;
                        const length = monsters.length;

                        monsters.forEach(
                            (monster: Monster, index: number): void => {
                                const delay: number =
                                    length > 5
                                        ? Math.round(
                                              (index *
                                                  ANIMATION_DURATION.KILL_ALL_DELAY) /
                                                  length
                                          )
                                        : 0;
                                setTimeout((): void => {
                                    killMonster(monster.id);
                                }, delay);
                            }
                        );
                    },

                    // Initialization
                    initialize: async () => {
                        await get().updateMonsterIndex();
                    },

                    setLoading: (loading: boolean) => {
                        set({ isLoading: loading });
                    },
                } as any),
            {
                limit: 50,
                partialize: (state: any) => ({
                    monsters: state.monsters,
                    settings: state.settings,
                    xp: state.xp,
                }),
            }
        ),
        {
            name: STORAGE_KEYS.MONSTER_COUNTER, // persist under this key
            partialize: (state) => ({
                monsters: state.monsters,
                monsterDetails: state.monsterDetails,
                monsterIndex: state.monsterIndex,
                settings: state.settings,
                xp: state.xp,
            }),
        }
    )
);

// Selectors for optimized subscriptions
export const useMonsters = () => useMonsterStore((state) => state.monsters);
export const useSettings = () => useMonsterStore((state) => state.settings);
export const useXp = () => useMonsterStore((state) => state.xp);
export const useIsLoading = () => useMonsterStore((state) => state.isLoading);
export const useCanUndo = () => useMonsterStore((state) => state.canUndo());
export const useCanRedo = () => useMonsterStore((state) => state.canRedo());
