import { expect, it } from 'vitest'
import { plantillaDesdeFilas } from './importarExcel'

it('asigna la nota de la fila al criterio', () => {
  const filas: unknown[][] = [[], [], [], [], ['N.º', 'Criterio de evaluación', '', '', 'Máximo'], ['1. A'], [1, 'Uno', null, null, 5]]
  const p = plantillaDesdeFilas(filas, 5, { 7: 'Mirar bien' })
  expect(p.secciones[0].items[0].instrucciones).toBe('Mirar bien')
})
