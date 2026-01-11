import type { MonsterDetails, MonsterIndex } from "@/types/MonsterDetails";
import { API_URL } from "@/constants";

export type InfoSlice = {
    monsterIndex: Record<string, MonsterIndex>;
    monsterDetails: Record<string, MonsterDetails>;
    updateMonsterIndex: () => Promise<void>;
    addMonsterDetails: (id: string) => Promise<void>;
    getMonsterIdByName: (name: string) => string | null;
    getMonsterDetails: (id: string) => MonsterDetails | null;
    getMonsterNames: () => string[];
    isMonsterDetailsAvailable: (id: string) => boolean;
}

export const createInfoSlice = (set: any, get: any): InfoSlice => ({
    monsterIndex: {},
    monsterDetails: {},

    updateMonsterIndex: async () => {
        try {
            const response = await fetch(`${API_URL}/api/2014/monsters`);
            if (!response.ok) {
                set({ monsterIndex: {} });
                return;
            }
            const data = await response.json();
            const index = data.results.reduce(
                (acc: Record<string, MonsterIndex>, monster: MonsterIndex) => {
                    acc[monster.index] = monster;
                    return acc;
                },
                {}
            );
            set({ monsterIndex: index });
        } catch (error) {
            console.error("Failed to fetch monster index:", error);
            set({ monsterIndex: {} });
        }
    },

    addMonsterDetails: async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/api/2014/monsters/${id}`);
            if (!response.ok) {
                throw new Error("Failed to fetch monster details");
            }
            const details = await response.json();
            set((state: any) => ({
                monsterDetails: { ...state.monsterDetails, [id]: details },
            }));
        } catch (error) {
            console.error("Failed to fetch monster details:", error);
        }
    },

    getMonsterIdByName: (name: string) => {
        const { monsterIndex } = get();
        for (const key in monsterIndex) {
            if (monsterIndex[key].name === name) {
                return monsterIndex[key].index;
            }
        }
        return null;
    },

    getMonsterDetails: (id: string) => {
        const { monsterDetails } = get();
        return monsterDetails[id] || null;
    },

    getMonsterNames: () => {
        const { monsterIndex } = get();
        return Object.keys(monsterIndex).map(
            (monster) => monsterIndex[monster].name
        );
    },

    isMonsterDetailsAvailable: (id: string) => {
        const { monsterDetails } = get();
        return id in monsterDetails;
    },
});
