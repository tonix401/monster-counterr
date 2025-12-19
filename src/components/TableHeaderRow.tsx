import React from "react";
import type { Settings } from "@/types/Settings";

interface TableHeaderRowProps {
    settings: Settings;
}

const TableHeaderRow: React.FC<TableHeaderRowProps> = ({ settings }) => {
    const headers: string[] = [];

    if (settings.showQuickActions) headers.push("Actions");
    headers.push("Name");
    if (settings.showConditions) headers.push("Conditions");
    if (settings.showStatus) headers.push("Status");
    if (settings.showHealth) headers.push("HP");
    if (settings.showChangeHp) headers.push("Change HP");

    return (
        <tr>
            {headers.map((header) => (
                <th
                    key={header}
                    id={`header-row-${header.toLowerCase().replace(" ", "-")}`}
                >
                    {header}
                </th>
            ))}
        </tr>
    );
};

export default TableHeaderRow;
