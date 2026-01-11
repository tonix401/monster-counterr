import { SAVE_FILE } from "@/constants";
import type { Monster } from "@/types/Monster";
import type { Settings } from "@/types/Settings";
import type { MonsterDetails, MonsterIndex } from "@/types/MonsterDetails";

export interface SaveData {
    schemaVersion: number;
    monsters: Monster[];
    currentXp: number;
    settings: Settings;
    monsterIndex: Record<string, MonsterIndex>;
    monsterDetails: Record<string, MonsterDetails>;
}

export type DataManagementSlice = {
    exportData: () => void;
    importData: (data: unknown) => boolean;
}

const isSaveData = (data: unknown): data is SaveData => {
    if (typeof data !== "object" || data === null) return false;
    const d = data as Partial<SaveData>;
    return (
        typeof d.schemaVersion === "number" &&
        Array.isArray(d.monsters) &&
        typeof d.currentXp === "number" &&
        typeof d.settings === "object" &&
        typeof d.monsterIndex === "object" &&
        typeof d.monsterDetails === "object"
    );
};

export const createDataManagementSlice = (
    set: any,
    get: any
): DataManagementSlice => ({
    exportData: () => {
        const { monsters, xp, settings, monsterIndex, monsterDetails } = get();
        const data: SaveData = {
            schemaVersion: SAVE_FILE.SCHEMA_VERSION,
            monsters,
            currentXp: xp,
            settings,
            monsterIndex,
            monsterDetails,
        };
        const dataJson = JSON.stringify(data, null, 2);
        const blob = new Blob([dataJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = SAVE_FILE.FILENAME;
        link.click();
        URL.revokeObjectURL(url);
    },

    importData: (data: unknown): boolean => {
        if (!isSaveData(data)) {
            console.error("Invalid save data format");
            return false;
        }

        try {
            switch (data.schemaVersion) {
                case 1:
                    set({
                        monsters: data.monsters || [],
                        xp: data.currentXp || 0,
                        settings: data.settings || get().settings,
                        monsterIndex: data.monsterIndex || {},
                        monsterDetails: data.monsterDetails || {},
                    });
                    return true;
                default:
                    alert(
                        `Unsupported save file schema version: ${data.schemaVersion}`
                    );
                    return false;
            }
        } catch (error) {
            console.error("Failed to load save file:", error);
            return false;
        }
    },
});
