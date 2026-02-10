import { ASSETS } from "@/constants"
import { useMonsterStore, useTerm } from "@/store/MonsterStore"
import { useNavigate } from "react-router"
import './AddMonsterRow.css'

export const AddMonsterRow = () => {
    const navigate = useNavigate()
    const t = useTerm()
    const { showQuickActions, showConditions, showStatus, showHealth, showChangeHp } = useMonsterStore((state) => state.settings)
    const cols = [showQuickActions, true, showConditions, showStatus, showHealth, showChangeHp].filter(Boolean).length

    return (<tr>
        <td colSpan={cols} style={{ textAlign: 'center' }}>
            <button onClick={() => navigate("add")} className="icon-button green-button add-monster-row-button" title={t("addNewMonsters")}>
                <img src={ASSETS.ADD_ICON} alt={t("addNewMonsters")} className="add-monster-row-button-icon" />
            </button>
        </td>
    </tr>)
}
