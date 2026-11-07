import { useState } from 'react'
import { useClientClientName, useClientStore, useClientTerm } from './store/ClientStore'

/** Edits the player's name; Enter or leaving the field sends it to the host */
export default function NameSetting() {
  const t = useClientTerm()
  const name = useClientClientName()
  const [draft, setDraft] = useState(name)

  const commit = (): void => {
    const next = draft.trim()
    if (!next) setDraft(name)
    else if (next !== name) useClientStore.getState().renameClient(next)
  }

  return (
    <div className="client-field">
      <label htmlFor="client-name">{t('yourName')}</label>
      <input
        id="client-name"
        type="text"
        value={draft}
        maxLength={50}
        className="client-name-input"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  )
}
