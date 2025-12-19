import React from "react";
import type { Settings } from "@/types/Settings";

interface SettingsRowProps {
    settingKey: keyof Settings;
    label: string;
    value: boolean;
    onChange: (key: keyof Settings, value: boolean) => void;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
    settingKey,
    label,
    value,
    onChange,
}) => {
    return (
        <div className="settings-row">
            <label htmlFor={settingKey}>{label}</label>
            <input
                type="checkbox"
                id={settingKey}
                checked={value}
                onChange={(e) => onChange(settingKey, e.target.checked)}
            />
        </div>
    );
};

export default SettingsRow;
