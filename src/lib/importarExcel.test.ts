import { describe, expect, it } from 'vitest'
import { plantillaDesdeFilas } from './importarExcel'

const filas: unknown[][] = [
  ['FIDELITY GROUP | INFORME DE AUDITORÍA INTERNA'],
  ['PATA MATRIZ · NOVIEMBRE 2026 · AI-PL-07'],
  [],
  ['Sucursal', 'PATA MATRIZ', 'Puntaje máximo', '=E61'],
  ['N.º', 'Criterio de evaluación', 'Hallazgo / observación', 'Anterior', 'Máximo', 'Puntaje actual', 'Tendencia'],
  ['1. CUMPLIMIENTO DE EXHIBICIONES', null, null, null, 10, 10, 1],
  [1, 'Exhibición de calzados', null, 5, 5, 5, 'EXCELENTE'],
  [2, 'Tickets', null, 4, 8, 5, 'MEJORA'],
  ['2. LIMPIEZA'],
  [1, 'Aspiradora', null, null, null],
  ['RESULTADO FINAL', null, null, null, 15],
]

describe('plantillaDesdeFilas', () => {
  it('lee título, código, secciones y criterios', () => {
    const p = plantillaDesdeFilas(filas)
    expect(p.titulo).toBe('INFORME DE AUDITORÍA INTERNA')
    expect(p.codigo).toBe('AI-PL-07')
    expect(p.secciones.map((s) => s.titulo)).toEqual(['CUMPLIMIENTO DE EXHIBICIONES', 'LIMPIEZA'])
    expect(p.secciones[0].items.map((i) => i.max)).toEqual([5, 8])
    expect(p.secciones[1].items[0]).toMatchObject({ texto: 'Aspiradora', max: 5 })
  })
  it('falla con mensaje claro si no es el formato', () => {
    expect(() => plantillaDesdeFilas([['hola']])).toThrow(/encabezados/)
  })
})
