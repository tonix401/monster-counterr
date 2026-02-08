import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import './ClientView.css'
import { ASSETS } from '../constants'
import type { MonsterStatus } from '../types/Monster'
import {
  useClientTerm,
  useClientLanguage,
  useClientSetLanguage,
  useClientAvailableLanguages,
  useClientIsLoading,
  useClientStore,
  useClientConnectionStatus,
  useClientConnectionError,
  useClientEncounterData,
  useClientClientName,
  useClientSetClientName,
  useClientSetHostId,
  useClientConnectToHost,
  useClientDisconnect,
  useClientSendAttack,
} from './store/ClientStore'

const ClientView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const hostId = searchParams.get('host')

  const t = useClientTerm()
  const language = useClientLanguage()
  const setLanguage = useClientSetLanguage()
  const availableLanguages = useClientAvailableLanguages()
  const isLoading = useClientIsLoading()
  const initialize = useClientStore((state) => state.initialize)
  const connectionStatus = useClientConnectionStatus()
  const error = useClientConnectionError()
  const data = useClientEncounterData()
  const clientName = useClientClientName()
  const setClientName = useClientSetClientName()
  const setHostId = useClientSetHostId()
  const connectToHost = useClientConnectToHost()
  const disconnect = useClientDisconnect()
  const sendAttack = useClientSendAttack()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    setHostId(hostId)
  }, [hostId, setHostId])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  if (connectionStatus === 'name-entry') {
    return (
      <div className="client-view-container">
        <div className="client-name-form">
          <h2>{t('enterYourName')}</h2>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t('yourName')}
            maxLength={50}
            className="client-name-input"
            onKeyDown={(e) => e.key === 'Enter' && connectToHost()}
            autoFocus
          />
          <button
            onClick={connectToHost}
            disabled={!clientName.trim()}
            className="client-connect-button green-button"
          >
            {t('connect')}
          </button>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="client-view-error">
        <h2>{t('error')}</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (connectionStatus === 'connecting') {
    return (
      <div className="client-view-connecting">
        <h2>{t('connectingToHost')}</h2>
        <p>
          {t('hostId')} {hostId}
        </p>
      </div>
    )
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="client-view-disconnected">
        <h2>{t('disconnected')}</h2>
        <p>{t('connectionLost')}</p>
      </div>
    )
  }

  const statusToProgressValue = (status: MonsterStatus): number => {
    switch (status) {
      case 'healthy':
        return 100
      case 'injured':
        return 50
      case 'badly-injured':
        return 25
      case 'down':
        return 0
      default:
        return 0
    }
  }

  return (
    <div className="client-view-container">
      <div className="client-view-header">
        <h2>{t('enemies')}</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isLoading}
          className="client-language-select"
        >
          {availableLanguages.map((lang) => (
            <option key={lang.key} value={lang.key}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      {!data || !data.enemies || data.enemies.length === 0 ? (
        <p>{t('noEnemiesInEncounter')}</p>
      ) : (
        <div className="client-view-grid">
          {data.enemies.map((enemy) => (
            <div key={enemy.id} className="client-enemy-row">
              <div className="client-enemy-header">
                <div className="client-enemy-name-and-health">
                  <h2>{enemy.name}</h2>
                  <progress
                    value={statusToProgressValue(enemy.status)}
                    max={100}
                    className={enemy.status + '-progress'}
                  />
                </div>
                <button
                  className="icon-button red-button"
                  onClick={() => {
                    sendAttack(enemy.id)
                  }}
                >
                  <img src={ASSETS.KNIFE_ICON} alt={t('attack')} />
                </button>
              </div>
              {enemy.conditions.map((condition, index) => (
                <div key={index} className="client-enemy-condition">
                  {t(condition)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClientView
