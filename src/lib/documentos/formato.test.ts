import { describe, expect, it } from 'vitest'
import { aclarar, fechaCorta, hexARgb, mesAnio, nombreArchivo } from './formato'

describe('formato de informe', () => {
  it('mes y año en mayúsculas', () => {
    expect(mesAnio('2026-11-11')).toBe('NOVIEMBRE 2026')
    expect(mesAnio('mal')).toBe('')
  })
  it('fecha corta', () => {
    expect(fechaCorta('2026-11-11')).toBe('11/11/2026')
  })
  it('colores', () => {
    expect(hexARgb('#193B59')).toEqual([25, 59, 89])
    expect(hexARgb('xyz')).toEqual([25, 59, 89])
    expect(aclarar([0, 0, 0], 0.5)).toEqual([128, 128, 128])
  })
  it('nombre de archivo sin tildes ni espacios', () => {
    expect(nombreArchivo('Pata Matriz Ñandú', '2026-11-11', 'pdf')).toBe('Auditoria_Pata-Matriz-Nandu_2026-11-11.pdf')
    expect(nombreArchivo('', '', 'pdf')).toBe('Auditoria_sucursal_sin-fecha.pdf')
  })
})
