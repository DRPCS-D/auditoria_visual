import type { Respuestas, Seccion } from './tipos'

/** Lo que muestra la columna «Tendencia» de un criterio. Vacío si falta el puntaje anterior o el actual. */
export type Tendencia = 'MEJORA' | 'BAJA' | 'EXCELENTE' | 'IGUAL' | ''

/**
 * Igual que la fórmula del Excel (MEJORA si sube, BAJA si baja), salvo que si el puntaje no cambió
 * y no es el máximo dice IGUAL en vez de EXCELENTE.
 */
export function tendencia(anterior: number | null, actual: number | null, max: number): Tendencia {
  if (anterior === null || actual === null) return ''
  if (actual > anterior) return 'MEJORA'
  if (actual < anterior) return 'BAJA'
  return actual >= max ? 'EXCELENTE' : 'IGUAL'
}

export interface ResumenSeccion {
  id: string
  titulo: string
  maximo: number
  obtenido: number
  /** 0 a 1 */
  cumplimiento: number
}

export interface ResumenAuditoria {
  maximo: number
  obtenido: number
  cumplimiento: number
  /** Criterios todavía sin puntaje actual. */
  sinPuntuar: number
  secciones: ResumenSeccion[]
}

/** Puntaje máximo y obtenido por sección y en total; lo que no tiene puntaje cuenta 0. */
export function resumir(secciones: Seccion[], respuestas: Respuestas): ResumenAuditoria {
  let maximo = 0
  let obtenido = 0
  let sinPuntuar = 0
  const resumen = secciones.map((s) => {
    let max = 0
    let obt = 0
    for (const it of s.items) {
      max += it.max
      const p = respuestas[it.id]?.p ?? null
      if (p === null) sinPuntuar++
      else obt += p
    }
    maximo += max
    obtenido += obt
    return { id: s.id, titulo: s.titulo, maximo: max, obtenido: obt, cumplimiento: max > 0 ? obt / max : 0 }
  })
  return { maximo, obtenido, cumplimiento: maximo > 0 ? obtenido / maximo : 0, sinPuntuar, secciones: resumen }
}

/** 0.9583 → '95,83%'. */
export function porcentaje(valor: number): string {
  return `${(valor * 100).toFixed(2).replace('.', ',')}%`
}

/** 4 → '4'; 4.5 → '4,5'. */
export function numero(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}
