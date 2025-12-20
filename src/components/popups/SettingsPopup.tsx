import React from "react";
import Popup from "@/components/popups/Popup";
import SettingsRow from "@/components/SettingsRow";
import ImportFileButton from "@/components/ui/ImportFileButton";
import type { Settings } from "@/types/Settings";
import { useMonsterStore } from "@/store";
import ExportFileButton from "../ui/ExportFileButton";

interface SettingsPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
    const settings = useMonsterStore((state) => state.settings);
    const setSetting = useMonsterStore((state) => state.setSetting);
    const getSettingName = useMonsterStore((state) => state.getSettingName);
    const handleSettingChange = (key: keyof Settings, value: boolean) => {
        setSetting(key, value);
    };

    return (
        <Popup isOpen={isOpen} onClose={onClose} width={500}>
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <strong>Visual Settings</strong>
            </div>
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
            <hr style={{ margin: "24px 0" }} />
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <strong>Behavioural Settings</strong>
            </div>
            <SettingsRow
                settingKey="autoRemoveDead"
                label={getSettingName("autoRemoveDead")}
                value={settings.autoRemoveDead}
                onChange={handleSettingChange}
            />
            <hr style={{ margin: "24px 0" }} />
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <strong>Manage Save Files</strong>
            </div>
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                }}
            >
                <ImportFileButton />
                <ExportFileButton />
            </div>
        </Popup>
    );
};

export default SettingsPopup;
