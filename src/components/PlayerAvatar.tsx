import React from 'react'
import { nameInitials } from '@/map/tokens'
import { TokenMark } from './TokenMark'

/** A player's letters inside a full ring in the players' colour */
const PlayerAvatar: React.FC<{ name: string; size?: number; faint?: boolean }> = ({
  name,
  size = 28,
  faint,
}) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    style={{ flex: 'none' }}
    aria-hidden="true"
  >
    <TokenMark
      cx={size / 2}
      cy={size / 2}
      r={size / 2}
      initials={nameInitials(name)}
      status="player"
      faint={faint}
    />
  </svg>
)

export default PlayerAvatar
