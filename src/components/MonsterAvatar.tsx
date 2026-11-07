import React from 'react'
import type { Monster } from '@/types/Monster'
import { monsterInitials, monsterStatus } from '@/map/tokens'
import { TokenMark } from './TokenMark'

interface MonsterAvatarProps {
  monster: Monster
  size?: number
  /** Dimmed, for monsters players can't see */
  faint?: boolean
}

/** A monster's letters inside a ring that shows roughly how healthy it is */
const MonsterAvatar: React.FC<MonsterAvatarProps> = ({ monster, size = 28, faint }) => (
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
      initials={monsterInitials(monster)}
      status={monsterStatus(monster)}
      faint={faint}
    />
  </svg>
)

export default MonsterAvatar
