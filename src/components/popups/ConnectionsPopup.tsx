import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import Popup from './Popup'
import { useMonsterStore, useTerm } from '@/store/useMonsterStore'
import { BASE_URL } from '@/constants'
import './ConnectionsPopup.css'

const ConnectionsPopup: React.FC = () => {
  const navigate = useNavigate()
  const t = useTerm()
  const peerId = useMonsterStore((state) => state.peerId)
  const connections = useMonsterStore((state) => state.connections)
  const initializeHost = useMonsterStore((state) => state.initializeHost)
  const disconnectAll = useMonsterStore((state) => state.disconnectAll)
  const isConnecting = useMonsterStore((state) => state.isConnecting)

  useEffect(() => {
    initializeHost()
  }, [initializeHost])

  const clientUrl = `${window.location.origin}${BASE_URL}#/client?host=${peerId}`

  return (
    <Popup onClose={() => navigate('/')} title={t('connections')} width={520}>
      <div className="connections-container">
        {isConnecting && <div>{t('connectingToSignalingServer')}</div>}
        {peerId ? (
          <>
            <div className="qr-wrapper">
              {isConnecting ? null : <QRCodeSVG value={clientUrl} size={256} />}
            </div>

            <a href={clientUrl} target="_blank" rel="noopener noreferrer">
              {t('connectionLink')}
            </a>

            <div className="connections-list-section">
              <div className="connections-header">
                <button
                  className="green-button stop-hosting-button"
                  onClick={() => {
                    disconnectAll()
                    navigate('/')
                  }}
                >
                  {t('stopHosting')}
                </button>
              </div>
              <div className="connections-count">
                {t('connectedClients')}: {connections.length} / 25
              </div>
              <ul className="connections-list">
                {connections.length === 0 ? (
                  <li className="no-connections">{t('noClientsConnected')}</li>
                ) : (
                  connections.map(({ conn, name }) => (
                    <li key={conn.peer} className="connection-item">
                      <span>{name}</span>
                      <span className="connection-status">{t('connected')}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : (
          !isConnecting && <div>{t('failedToInitializeConnection')}</div>
        )}
      </div>
    </Popup>
  )
}

export default ConnectionsPopup
