import React from "react";
import type { Settings } from "@/types/Settings";

interface TableColgroupProps {
    settings: Settings;
}

const TableColgroup: React.FC<TableColgroupProps> = ({ settings }) => {
    const cols: string[] = [];

    if (settings.showQuickActions) cols.push("actions");
    cols.push("name");
    if (settings.showConditions) cols.push("conditions");
    if (settings.showStatus) cols.push("status");
    if (settings.showHealth) cols.push("hp");
    if (settings.showChangeHp) cols.push("change-hp");

    return (
        <colgroup>
            {cols.map((col) => (
                <col key={col} id={`col-${col}`} />
            ))}
        </colgroup>
    );
};

export default TableColgroup;
