import React from "react";
import type { Monster } from "@/types/Monster";

interface HpTableDataProps {
    monster: Monster;
}

const HpTableData: React.FC<HpTableDataProps> = ({ monster }) => {
    return (
        <td>
            {monster.hp > monster.maxhp
                ? `${monster.hp - monster.maxhp} + `
                : ""}
            {Math.min(monster.hp, monster.maxhp)} / {monster.maxhp}
        </td>
    );
};

export default HpTableData;
