import React from "react";
import type { Monster } from "@/types/Monster";
import { useMonsterStore } from "@/store";
import { CONDITIONS } from "@/constants";

interface ConditionsTableDataProps {
    monster: Monster;
}

const ConditionsTableData: React.FC<ConditionsTableDataProps> = ({
    monster,
}) => {
    const [hoveredCondition, setHoveredCondition] = React.useState<
        string | null
    >(null);

    const addMonsterCondition = useMonsterStore(
        (state) => state.addMonsterCondition
    );
    const removeMonsterCondition = useMonsterStore(
        (state) => state.removeMonsterCondition
    );

    const handleRemoveCondition = (condition: string) => {
        removeMonsterCondition(monster.id, condition);
    };

    const handleAddCondition = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value) {
            addMonsterCondition(monster.id, e.target.value);
            e.target.value = "";
        }
    };

    const remainingConditions = [...CONDITIONS]
        .sort()
        .filter((c: string) => !monster.conditions.includes(c));

    return (
        <td>
            <div className="conditions-container">
                {monster.conditions.map((condition) => (
                    <button
                        key={condition}
                        className="condition-tag red-button"
                        onClick={() => handleRemoveCondition(condition)}
                        onMouseEnter={() => setHoveredCondition(condition)}
                        onMouseLeave={() => setHoveredCondition(null)}
                    >
                        {hoveredCondition === condition ? "Remove" : condition}
                    </button>
                ))}
                {remainingConditions.length > 0 && (
                    <select
                        className="add-condition-tag"
                        onChange={handleAddCondition}
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Add Condition
                        </option>
                        {remainingConditions.map((condition: string) => (
                            <option key={condition} value={condition}>
                                {condition}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </td>
    );
};

export default ConditionsTableData;
