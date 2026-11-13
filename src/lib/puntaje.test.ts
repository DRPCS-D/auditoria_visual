import { describe, expect, it } from 'vitest'
import { porcentaje, resumir, tendencia } from './puntaje'
import type { Seccion } from './tipos'

const secciones: Seccion[] = [
  { id: 's1', titulo: 'A', items: [{ id: 'a', texto: 'x', max: 5 }, { id: 'b', texto: 'y', max: 5 }] },
  { id: 's2', titulo: 'B', items: [{ id: 'c', texto: 'z', max: 10 }] },
]

describe('tendencia', () => {
  it('compara contra el puntaje anterior', () => {
    expect(tendencia(4, 5, 5)).toBe('MEJORA')
    expect(tendencia(5, 4, 5)).toBe('BAJA')
    expect(tendencia(5, 5, 5)).toBe('EXCELENTE')
    expect(tendencia(3, 3, 5)).toBe('IGUAL')
  })
  it('queda vacía si falta alguno de los dos', () => {
    expect(tendencia(null, 5, 5)).toBe('')
    expect(tendencia(5, null, 5)).toBe('')
  })
})

describe('resumir', () => {
  it('suma máximos y obtenidos por sección y total', () => {
    const r = resumir(secciones, { a: { a: null, p: 5, h: '' }, b: { a: null, p: 4, h: '' }, c: { a: null, p: 10, h: '' } })
    expect(r.maximo).toBe(20)
    expect(r.obtenido).toBe(19)
    expect(r.cumplimiento).toBeCloseTo(0.95)
    expect(r.secciones[0]).toMatchObject({ maximo: 10, obtenido: 9 })
    expect(r.sinPuntuar).toBe(0)
  })
  it('cuenta lo que falta y lo toma como 0', () => {
    const r = resumir(secciones, { a: { a: 3, p: 5, h: '' } })
    expect(r.obtenido).toBe(5)
    expect(r.sinPuntuar).toBe(2)
  })
  it('sin criterios no divide por cero', () => {
    expect(resumir([], {}).cumplimiento).toBe(0)
  })
})

it('porcentaje usa coma y dos decimales', () => {
  expect(porcentaje(0.99)).toBe('99,00%')
})
