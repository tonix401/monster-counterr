import React, { useEffect } from "react";
import { useMonsterStore } from "@/store";

interface MonsterSuggestionInputProps {
    onHpChange: (hp: number) => void;
    value: string;
    onChange: (value: string) => void;
}

const MonsterSuggestionInput: React.FC<MonsterSuggestionInputProps> = ({
    onHpChange,
    value,
    onChange,
}) => {
    const getMonsterNames = useMonsterStore((state) => state.getMonsterNames);
    const getMonsterIdByName = useMonsterStore(
        (state) => state.getMonsterIdByName
    );
    const isMonsterDetailsAvailable = useMonsterStore(
        (state) => state.isMonsterDetailsAvailable
    );
    const addMonsterDetails = useMonsterStore(
        (state) => state.addMonsterDetails
    );
    const getMonsterDetails = useMonsterStore(
        (state) => state.getMonsterDetails
    );

    const monsterNames = getMonsterNames();

    const handleInputChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const query = e.target.value;
        onChange(query);

        if (query && monsterNames.includes(query)) {
            const id = getMonsterIdByName(query);
            if (!id) return;

            if (!isMonsterDetailsAvailable(id)) {
                await addMonsterDetails(id);
            }
            const details = getMonsterDetails(id);
            if (details) {
                onHpChange(details.hit_points);
            }
        }
    };

    useEffect(() => {
        if (value && monsterNames.includes(value)) {
            (async () => {
                const id = getMonsterIdByName(value);
                if (!id) return;

                if (!isMonsterDetailsAvailable(id)) {
                    await addMonsterDetails(id);
                }
                const details = getMonsterDetails(id);
                if (details) {
                    onHpChange(details.hit_points);
                }
            })();
        }
    }, [value]);

    return (
        <div className="suggestion-input-container">
            <input
                id="monster-suggestion-input"
                placeholder="Name"
                required
                value={value}
                onChange={handleInputChange}
                list="monster-names-datalist"
            />
            <datalist id="monster-names-datalist">
                {monsterNames.map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>
        </div>
    );
};

export default MonsterSuggestionInput;