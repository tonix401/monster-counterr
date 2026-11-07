import { describe, expect, it } from 'vitest'
import { newMapId, uniqueName } from './mapLibrary'

describe('uniqueName', () => {
  it('keeps a free name and numbers a taken one', () => {
    expect(uniqueName('Inn', [])).toBe('Inn')
    expect(uniqueName('Inn', ['Inn'])).toBe('Inn (2)')
    expect(uniqueName('Inn', ['Inn', 'inn (2)'])).toBe('Inn (3)')
  })

  it('trims, and names an empty one', () => {
    expect(uniqueName('  Inn ', ['inn'])).toBe('Inn (2)')
    expect(uniqueName('   ', [])).toBe('map')
  })
})

describe('newMapId', () => {
  it('is different every time', () => {
    expect(newMapId()).not.toBe(newMapId())
  })
})
