import { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router'

/**
 * navigate() for the popups: on the map tab they open at /map/..., so the map stays behind them
 * and closing one returns to the map instead of the encounter tab. Pass absolute paths.
 */
export function useGo(): (to: string) => void {
  const navigate = useNavigate()
  const onMap = useMatch('/map/*') !== null
  return useCallback(
    (to: string) => navigate(onMap ? (to === '/' ? '/map' : `/map${to}`) : to),
    [navigate, onMap]
  )
}
