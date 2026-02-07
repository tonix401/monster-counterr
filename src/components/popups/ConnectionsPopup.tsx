import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import Popup from './Popup'
import { useMonsterStore, useTerm } from '@/store/index'
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

  const clientUrl = `${window.location.origin}${BASE_URL}/client?host=${peerId}`

  return (
    <Popup onClose={() => navigate('/')} title={t('connections')} width={520}>
      <div className="connections-container">
        {isConnecting && <div>Connecting to signaling server...</div>}
        {peerId ? (
          <>
            <div className="qr-wrapper">
              <QRCodeSVG value={clientUrl} size={256} />
            </div>

            <div className="peer-info">
              <p>Peer ID:</p>
              <code className="peer-id-code">{peerId}</code>
              <p>Client URL:</p>
              {clientUrl}
            </div>

            <div className="connections-list-section">
              <div className="connections-header">
                <h3>Connected Clients ({connections.length})</h3>
                <button
                  className="green-button stop-hosting-button"
                  onClick={() => {
                    disconnectAll()
                    navigate('/')
                  }}
                >
                  Stop Hosting
                </button>
              </div>
              <ul className="connections-list">
                {connections.length === 0 ? (
                  <li className="no-connections">No clients connected</li>
                ) : (
                  connections.map((conn) => (
                    <li key={conn.peer} className="connection-item">
                      <span>{conn.peer}</span>
                      <span className="connection-status">Connected</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : (
          !isConnecting && <div>Failed to initialize connection.</div>
        )}
      </div>
    </Popup>
  )
}

export default ConnectionsPopup
