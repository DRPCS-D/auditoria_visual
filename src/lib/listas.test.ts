import { describe, expect, it } from 'vitest'
import { idNuevo, mover } from './listas'

describe('mover', () => {
  it('intercambia con el vecino', () => {
    expect(mover([1, 2, 3], 1, -1)).toEqual([2, 1, 3])
    expect(mover([1, 2, 3], 1, 1)).toEqual([1, 3, 2])
  })
  it('no se sale de los extremos', () => {
    const l = [1, 2, 3]
    expect(mover(l, 0, -1)).toBe(l)
    expect(mover(l, 2, 1)).toBe(l)
  })
})

it('idNuevo cumple el formato que acepta el backend', () => {
  for (let i = 0; i < 50; i++) expect(idNuevo()).toMatch(/^[a-z0-9]{1,12}$/)
})
