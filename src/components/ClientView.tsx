import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import Peer, { type DataConnection } from 'peerjs'

const ClientView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const hostId = searchParams.get('host')
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'connecting'
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hostId) {
      setStatus('error')
      setError('No host ID provided in URL')
      return
    }

    const peer = new Peer()
    let conn: DataConnection | null = null

    peer.on('open', (id) => {
      console.log('Client peer opened with ID:', id)
      conn = peer.connect(hostId)

      conn.on('open', () => {
        setStatus('connected')
        console.log('Connected to host:', hostId)
      })

      conn.on('data', (receivedData) => {
        console.log('Received data:', receivedData)
        setData(receivedData)
      })

      conn.on('close', () => {
        setStatus('disconnected')
      })

      conn.on('error', (err) => {
        console.error('Connection error:', err)
        setStatus('error')
        setError('Connection error')
      })
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
      setStatus('error')
      setError(err.message)
    })

    return () => {
      conn?.close()
      peer.destroy()
    }
  }, [hostId])

  if (status === 'error') {
    return (
      <div style={{ padding: '2rem', color: '#ff5252' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Connecting to Host...</h2>
        <p>Host ID: {hostId}</p>
      </div>
    )
  }

  if (status === 'disconnected') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Disconnected</h2>
        <p>The connection to the host was lost.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Encounter Status</h1>
      {!data || !data.enemies || data.enemies.length === 0 ? (
        <p>No enemies in encounter.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {data.enemies.map((enemy: any, i: number) => (
            <div
              key={i}
              style={{
                padding: '1rem',
                border: '1px solid #444',
                borderRadius: '8px',
                background: enemy.health === 0 ? '#2a1a1a' : '#222',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h2 style={{ margin: 0 }}>{enemy.name}</h2>
                <span
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: enemy.health === 0 ? '#ff5252' : '#4caf50',
                  }}
                >
                  {enemy.health} HP
                </span>
              </div>
              {enemy.conditions && enemy.conditions.length > 0 && (
                <div
                  style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  {enemy.conditions.map((c: string) => (
                    <span
                      key={c}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.2rem 0.5rem',
                        background: '#555',
                        borderRadius: '4px',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClientView
