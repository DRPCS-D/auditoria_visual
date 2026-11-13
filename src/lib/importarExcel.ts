import { idNuevo } from './listas'
import type { Seccion } from './tipos'

/** Lo que se rescata de un Excel de auditoría para armar una plantilla. */
export interface PlantillaImportada {
  titulo: string
  codigo: string
  secciones: Seccion[]
}

const texto = (v: unknown): string => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim())

const numero = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(texto(v).replace(',', '.'))
  return texto(v) !== '' && Number.isFinite(n) ? n : null
}

/**
 * Arma una plantilla a partir de las filas de la hoja, con el formato del Excel original:
 * fila 1 «EMPRESA | TÍTULO», fila 2 «SUCURSAL · MES · CÓDIGO», una fila de encabezados («Criterio…», «Máximo») y debajo
 * las secciones (texto en la primera columna, sin criterio) con sus criterios (número en la primera, texto en la segunda,
 * puntaje máximo en la columna «Máximo»). Las filas de sumas, «RESULTADO FINAL» y todo lo de arriba del encabezado se ignoran.
 */
export function plantillaDesdeFilas(filas: unknown[][], escalaMax = 5): PlantillaImportada {
  const celda = (f: unknown[] | undefined, i: number) => (f ? f[i] : undefined)

  const iEnc = filas.findIndex((f) => f.some((c) => /criterio/i.test(texto(c))))
  if (iEnc === -1) throw new Error('No encuentro la fila de encabezados («Criterio de evaluación»).')
  const enc = filas[iEnc]
  const colTexto = enc.findIndex((c) => /criterio/i.test(texto(c)))
  const colMax = enc.findIndex((c) => /m[aá]ximo/i.test(texto(c)))

  const partes = texto(celda(filas[0], 0)).split('|')
  const titulo = (partes.length > 1 ? partes.slice(1).join('|') : partes[0]).trim()
  const ultima = texto(celda(filas[1], 0)).split(/[·•]/).pop()?.trim() ?? ''
  const codigo = /^\S{2,30}$/.test(ultima) && /[-\d]/.test(ultima) ? ultima : ''

  const secciones: Seccion[] = []
  for (const f of filas.slice(iEnc + 1)) {
    const a = texto(celda(f, 0))
    const b = texto(celda(f, colTexto))
    if (/^resultado/i.test(a)) break
    if (a && !b && numero(celda(f, 0)) === null) {
      secciones.push({ id: idNuevo(), titulo: a.replace(/^\d+\s*[.)-]\s*/, ''), items: [] })
    } else if (b && secciones.length > 0) {
      const max = colMax >= 0 ? numero(celda(f, colMax)) : null
      secciones[secciones.length - 1].items.push({ id: idNuevo(), texto: b, max: max !== null && max > 0 ? max : escalaMax })
    }
  }
  const validas = secciones.filter((s) => s.items.length > 0)
  if (validas.length === 0) throw new Error('No encontré criterios en el Excel.')
  return { titulo, codigo, secciones: validas }
}

/** Lee la primera hoja del archivo .xlsx y la convierte en plantilla. La librería se carga recién al usarla. */
export async function plantillaDesdeExcel(archivo: File): Promise<PlantillaImportada> {
  const { readSheet } = await import('read-excel-file/browser')
  const filas = (await readSheet(archivo)) as unknown[][]
  return plantillaDesdeFilas(filas)
}
