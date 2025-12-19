import React, { useState } from "react";
import Popup from "@/components/popups/Popup";
import MonsterSuggestionInput from "@/components/MonsterSuggestionInput";
import { useMonsterStore } from "@/store";

interface AddMonsterPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddMonsterPopup: React.FC<AddMonsterPopupProps> = ({
    isOpen,
    onClose,
}) => {
    const [name, setName] = useState("");
    const [hp, setHp] = useState("");
    const [amount, setAmount] = useState("");

    const addMonster = useMonsterStore((state) => state.addMonster);

    const handleAdd = () => {
        const trimmedName = name.trim();
        const hpValue = parseInt(hp) || 1;
        const amountValue = parseInt(amount) || 1;

        if (trimmedName === "") {
            alert("Cannot save a monster without a name");
            return;
        }

        addMonster(trimmedName, hpValue, amountValue);
        setName("");
        setHp("");
        setAmount("");
        onClose();
    };

    const handleKeyDown = (
        e: React.KeyboardEvent,
        nextField: "hp" | "amount" | "add"
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (nextField === "add") {
                handleAdd();
            } else {
                const fieldId =
                    nextField === "hp" ? "hp-input" : "amount-input";
                document.getElementById(fieldId)?.focus();
            }
        }
    };

    return (
        <Popup
            isOpen={isOpen}
            onClose={onClose}
            title="Add Monster"
            width={300}
        >
            <MonsterSuggestionInput
                onHpChange={(newHp) => setHp(newHp.toString())}
                value={name}
                onChange={setName}
            />
            <input
                id="hp-input"
                type="number"
                placeholder="HP"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "amount")}
            />
            <input
                id="amount-input"
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "add")}
            />
            <button className="green-button" onClick={handleAdd}>
                Add Monster
            </button>
        </Popup>
    );
};

export default AddMonsterPopup;
