import React, { Component, type ReactNode } from 'react'
import Popup from './popups/Popup'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Popup title="Error" onClose={this.resetError} width={1000} style={{ borderColor: "var(--damage)"}}>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <pre
            style={{
              fontSize: '0.85rem',
              overflow: 'auto',
              color: 'var(--text-secondary)',
              background: 'var(--overlay-heavy)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            {this.state.error?.stack}
          </pre>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button onClick={this.resetError} className="green-button transparent-button">
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="green-button transparent-button"
            >
              Reload
            </button>
          </div>
        </Popup>
      )
    }

    return this.props.children
  }
}
