import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Peer, { type DataConnection } from 'peerjs'
import './ClientView.css'
import { ASSETS } from '../constants'
import type { MonsterStatus } from '../types/Monster'
import {
  useClientTerm,
  useClientStore,
  useClientLanguage,
  useClientSetLanguage,
  useClientAvailableLanguages,
  useClientIsLoading,
} from './store'

interface Enemy {
  id: string
  name: string
  status: MonsterStatus
  conditions: string[]
}

interface EncounterData {
  enemies: Enemy[]
}

const ClientView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const hostId = searchParams.get('host')
  const [data, setData] = useState<EncounterData | null>(null)
  const [status, setStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error' | 'name-entry'
  >('name-entry')
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const pingIntervalRef = useRef<number | null>(null)
  const healthCheckIntervalRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const lastPongTimeRef = useRef<number>(Date.now())

  const t = useClientTerm()
  const language = useClientLanguage()
  const setLanguage = useClientSetLanguage()
  const availableLanguages = useClientAvailableLanguages()
  const isLoading = useClientIsLoading()
  const initialize = useClientStore((state) => state.initialize)

  const clearPingInterval = () => {
    if (pingIntervalRef.current) {
      window.clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }

  const clearHealthCheckInterval = () => {
    if (healthCheckIntervalRef.current) {
      window.clearInterval(healthCheckIntervalRef.current)
      healthCheckIntervalRef.current = null
    }
  }

  const cleanupConnection = () => {
    clearPingInterval()
    clearHealthCheckInterval()
    if (connRef.current) {
      connRef.current.close()
      connRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
  }

  const startPing = () => {
    clearPingInterval()
    clearHealthCheckInterval()

    lastPongTimeRef.current = Date.now()

    // Send pings every 20 seconds
    pingIntervalRef.current = window.setInterval(() => {
      if (connRef.current?.open) {
        connRef.current.send({ type: 'ping' })
      }
    }, 20000)

    // Check connection health every 10 seconds
    healthCheckIntervalRef.current = window.setInterval(() => {
      const now = Date.now()
      const timeSinceLastPong = now - lastPongTimeRef.current
      const timeout = 35000 // 35 seconds (ping interval is 20s)

      if (timeSinceLastPong > timeout) {
        console.log('Connection timeout - no pong received')
        setStatus('disconnected')
        scheduleReconnect()
      }
    }, 10000)
  }

  const connectToHost = () => {
    if (!clientName.trim() || !hostId) return
    if (peerRef.current) return

    console.log('Attempting to connect to host:', hostId)
    setStatus('connecting')

    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', (id) => {
      console.log('Client peer opened with ID:', id)
      console.log('Connecting to host peer:', hostId)
      const conn = peer.connect(hostId)
      connRef.current = conn

      conn.on('open', () => {
        console.log('Connection opened to host:', hostId)
        conn.send({ type: 'client-name', name: clientName })
        reconnectAttemptsRef.current = 0
        startPing()
        setStatus('connected')
        console.log('Status set to connected')
      })

      conn.on('data', (receivedData) => {
        if (receivedData && typeof receivedData === 'object' && 'type' in receivedData) {
          if (receivedData.type === 'pong') {
            lastPongTimeRef.current = Date.now()
            return
          }
        }
        console.log('Received data:', receivedData)
        setData(receivedData as EncounterData)
      })

      conn.on('close', () => {
        setStatus('disconnected')
        scheduleReconnect()
      })

      conn.on('error', (err) => {
        console.error('Connection error:', err)
        setError(t('connectionError'))
        setStatus('disconnected')
        scheduleReconnect()
      })
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
      setError(err.message)
      setStatus('disconnected')
      scheduleReconnect()
    })
  }

  const scheduleReconnect = () => {
    if (!clientName.trim() || !hostId) return
    cleanupConnection()

    const attempt = reconnectAttemptsRef.current + 1
    reconnectAttemptsRef.current = attempt
    const delay = Math.min(1000 * 2 ** (attempt - 1), 10000)

    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connectToHost()
    }, delay)
  }

  const handleConnect = () => {
    if (!clientName.trim() || !hostId) return
    connectToHost()
  }

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!hostId) {
      setStatus('error')
      setError(t('noHostIdProvided'))
    }
  }, [hostId, t])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      cleanupConnection()
    }
  }, [])

  if (status === 'name-entry') {
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
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            autoFocus
          />
          <button
            onClick={handleConnect}
            disabled={!clientName.trim()}
            className="client-connect-button green-button"
          >
            {t('connect')}
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="client-view-error">
        <h2>{t('error')}</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="client-view-connecting">
        <h2>{t('connectingToHost')}</h2>
        <p>
          {t('hostId')} {hostId}
        </p>
      </div>
    )
  }

  if (status === 'disconnected') {
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
          {data.enemies.map((enemy: Enemy) => (
            <div key={enemy.id} className="client-enemy-row">
              <div className="client-enemy-header">
                <div className="client-enemy-name-and-health">
                  <h2>{enemy.name}</h2>
                  <progress value={statusToProgressValue(enemy.status)} max={100} className={enemy.status + "-progress"}/>
                </div>
                <button
                  className="icon-button red-button"
                  onClick={() => {
                    if (connRef.current?.open) {
                      connRef.current.send({ type: 'attack', monsterId: enemy.id })
                    }
                  }}
                >
                  <img src={ASSETS.KNIFE_ICON} alt={t('attack')} />
                </button>
              </div>
              {enemy.conditions.map((condition, j) => (
                <div key={j} className="client-enemy-condition">
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
