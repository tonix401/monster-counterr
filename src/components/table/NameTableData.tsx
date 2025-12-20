import React, { useState } from "react";
import type { Monster } from "@/types/Monster";
import { useMonsterStore } from "@/store";
import MonsterInfoPopup from "@/components/popups/MonsterInfoPopup";

interface NameTableDataProps {
    monster: Monster;
}

const NameTableData: React.FC<NameTableDataProps> = ({ monster }) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const isMonsterDetailsAvailable = useMonsterStore(
        (state) => state.isMonsterDetailsAvailable,
    );
    const getMonsterDetails = useMonsterStore(
        (state) => state.getMonsterDetails,
    );

    const hasDetails = isMonsterDetailsAvailable(monster.detailIndex);
    const monsterDetails = hasDetails
        ? getMonsterDetails(monster.detailIndex)
        : null;

    const handleClick = () => {
        if (hasDetails) {
            setIsPopupOpen(true);
        }
    };

    return (
        <>
            <td
                className="name-cell"
                style={{ color: monster.hp > 0 ? "inherit" : "gray" }}
            >
                <div onClick={handleClick} style={{ display: "flex", alignItems: "center" }}>
                    {monster.hp > 0 ? "" : "💀  "}
                    <span
                        style={{
                            display: "inline-block",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            width: "90%",
                        }}
                        className={hasDetails ? "clickable" : ""}
                    >
                        {monster.name}
                    </span>
                    <span style={{ display: "inline-block" }}>
                        {monster.number ? `${monster.number}` : ""}
                    </span>
                </div>
                <MonsterInfoPopup
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    monsterDetails={monsterDetails}
                />
            </td>
        </>
    );
};

export default NameTableData;
