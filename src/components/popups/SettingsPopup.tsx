import React from "react";
import Popup from "@/components/popups/Popup";
import SettingsRow from "@/components/SettingsRow";
import type { Settings } from "@/types/Settings";
import { useMonsterStore } from "@/store";

interface SettingsPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
    const settings = useMonsterStore((state) => state.settings);
    const setSetting = useMonsterStore((state) => state.setSetting);
    const getSettingName = useMonsterStore((state) => state.getSettingName);
    const importData = useMonsterStore((state) => state.importData);

    const handleSettingChange = (key: keyof Settings, value: boolean) => {
        setSetting(key, value);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                importData(data);
                onClose();
            } catch (error) {
                console.error("Failed to load save file:", error);
                alert("Failed to load save file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <Popup isOpen={isOpen} onClose={onClose} title="Settings" width={400}>
            <SettingsRow
                settingKey="showConditions"
                label={getSettingName("showConditions")}
                value={settings.showConditions}
                onChange={handleSettingChange}
            />
            <SettingsRow
                settingKey="showStatus"
                label={getSettingName("showStatus")}
                value={settings.showStatus}
                onChange={handleSettingChange}
            />
            <SettingsRow
                settingKey="showHealth"
                label={getSettingName("showHealth")}
                value={settings.showHealth}
                onChange={handleSettingChange}
            />
            <SettingsRow
                settingKey="showChangeHp"
                label={getSettingName("showChangeHp")}
                value={settings.showChangeHp}
                onChange={handleSettingChange}
            />
            <SettingsRow
                settingKey="showXpCounter"
                label={getSettingName("showXpCounter")}
                value={settings.showXpCounter}
                onChange={handleSettingChange}
            />
            <SettingsRow
                settingKey="showQuickActions"
                label={getSettingName("showQuickActions")}
                value={settings.showQuickActions}
                onChange={handleSettingChange}
            />
            <hr />
            <SettingsRow
                settingKey="autoRemoveDead"
                label={getSettingName("autoRemoveDead")}
                value={settings.autoRemoveDead}
                onChange={handleSettingChange}
            />
            <hr />
            <input
                type="file"
                accept="application/json"
                onChange={handleFileUpload}
            />
        </Popup>
    );
};

export default SettingsPopup;
