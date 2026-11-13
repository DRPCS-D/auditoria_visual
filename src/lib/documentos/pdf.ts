import type { CellDef, RowInput } from 'jspdf-autotable'
import { numero, porcentaje, resumir, tendencia, type Tendencia } from '@/lib/puntaje'
import type { Auditoria } from '@/lib/tipos'
import { aclarar, fechaCorta, hexARgb, mesAnio, nombreArchivo, type RGB } from './formato'

/** Azul del encabezado de columnas del Excel original; con otro color de empresa se aclara ese color. */
const AZUL_ENCABEZADO: RGB = [57, 113, 141]
const AZUL_DEFECTO: RGB = [25, 59, 89]
const FONDO_PUNTAJE: RGB = [232, 243, 250]

const COLOR_TENDENCIA: Record<Exclude<Tendencia, ''>, RGB> = {
  MEJORA: [22, 130, 70],
  BAJA: [190, 40, 40],
  EXCELENTE: [25, 59, 89],
  IGUAL: [110, 110, 110],
}

/**
 * Genera y descarga el informe de la auditoría en PDF, con el mismo formato del Excel original:
 * cabecera con empresa y formato, datos de la tienda y resultado, y la tabla de criterios por sección.
 * jsPDF se carga recién al pedirlo (pesa bastante).
 */
export async function descargarInformePdf(a: Auditoria): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 12
  const ancho = W - 2 * M

  const principal = hexARgb(a.color)
  const encabezado = principal.every((c, i) => c === AZUL_DEFECTO[i]) ? AZUL_ENCABEZADO : aclarar(principal, 0.3)
  const res = resumir(a.secciones, a.respuestas)

  // Cabecera
  doc.setFillColor(...principal)
  doc.rect(M, M, ancho, 11, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(255)
  doc.text(`${a.empresaNombre.toUpperCase()} | ${a.titulo}`, M + 3, M + 7.6)
  doc.setTextColor(0).setFont('helvetica', 'normal').setFontSize(11)
  doc.text(
    [a.sucursalNombre.toUpperCase(), mesAnio(a.fecha), a.codigo].filter(Boolean).join(' · '),
    M + 3,
    M + 17,
  )

  // Datos de la tienda (izquierda) y resultado (derecha)
  const datos: [string, string][] = [
    ['Sucursal', a.sucursalNombre],
    ['Encargada', a.encargada],
    ['Auditor', a.auditor],
    ['Fecha', fechaCorta(a.fecha)],
  ]
  const resultado: [string, string][] = [
    ['Puntaje máximo', numero(res.maximo)],
    ['Puntos obtenidos', numero(res.obtenido)],
    ['Cumplimiento', porcentaje(res.cumplimiento)],
  ]
  const y0 = M + 22
  const alto = 6
  const dibujarCaja = (x: number, anchoLabel: number, anchoValor: number, filas: [string, string][]) => {
    filas.forEach(([label, valor], i) => {
      const y = y0 + i * alto
      doc.setDrawColor(200).setLineWidth(0.15)
      doc.setFillColor(240, 244, 248).rect(x, y, anchoLabel, alto, 'FD')
      doc.rect(x + anchoLabel, y, anchoValor, alto, 'S')
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(40)
      doc.text(label, x + 2, y + 4.1)
      doc.setFont('helvetica', 'normal').setTextColor(0)
      doc.text(valor || '—', x + anchoLabel + 2, y + 4.1, { maxWidth: anchoValor - 4 })
    })
  }
  dibujarCaja(M, 28, 82, datos)
  dibujarCaja(M + 130, 32, 36, resultado)

  // Tabla de criterios
  const centrado = { halign: 'center' as const }
  const body: RowInput[] = []
  /** Posiciones de `body` que son títulos de sección (no deben quedar solos al pie de una hoja). */
  const filasSeccion = new Set<number>()
  a.secciones.forEach((s, i) => {
    const r = res.secciones[i]
    const fila: CellDef[] = [
      { content: `${i + 1}. ${s.titulo}`, colSpan: 4, styles: { fillColor: principal, textColor: 255, fontStyle: 'bold' } },
      { content: numero(r.maximo), styles: { ...centrado, fillColor: principal, textColor: 255, fontStyle: 'bold' } },
      { content: numero(r.obtenido), styles: { ...centrado, fillColor: principal, textColor: 255, fontStyle: 'bold' } },
      { content: porcentaje(r.cumplimiento), styles: { ...centrado, fillColor: principal, textColor: 255, fontStyle: 'bold' } },
    ]
    filasSeccion.add(body.length)
    body.push(fila)
    s.items.forEach((it, j) => {
      const resp = a.respuestas[it.id]
      const anterior = resp?.a ?? null
      const actual = resp?.p ?? null
      const t = tendencia(anterior, actual, it.max)
      body.push([
        { content: String(j + 1), styles: centrado },
        it.texto,
        resp?.h ?? '',
        { content: anterior === null ? '' : numero(anterior), styles: centrado },
        { content: numero(it.max), styles: centrado },
        { content: actual === null ? '' : numero(actual), styles: { ...centrado, fillColor: FONDO_PUNTAJE, fontStyle: 'bold' } },
        { content: t, styles: { ...centrado, fontStyle: 'bold', textColor: t ? COLOR_TENDENCIA[t] : 0, fontSize: 7.5 } },
      ])
    })
  })
  const estiloFinal = { ...centrado, fillColor: principal, textColor: 255, fontStyle: 'bold' as const }
  body.push([
    { content: 'RESULTADO FINAL', colSpan: 4, styles: { fillColor: principal, textColor: 255, fontStyle: 'bold' } },
    { content: numero(res.maximo), styles: estiloFinal },
    { content: numero(res.obtenido), styles: estiloFinal },
    { content: porcentaje(res.cumplimiento), styles: estiloFinal },
  ])

  const yTabla = y0 + datos.length * alto + 5
  const opciones = (
    d: typeof doc,
    filas: RowInput[],
    startY: number,
    alDibujarFila?: (indice: number, pagina: number) => void,
  ) =>
    autoTable(d, {
      startY,
      head: [['N.º', 'Criterio de evaluación', 'Hallazgo / observación', 'Anterior', 'Máximo', 'Puntaje actual', 'Tendencia']],
      body: filas,
      margin: { left: M, right: M, top: M, bottom: 14 },
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [200, 200, 200], lineWidth: 0.15, valign: 'middle', textColor: 20 },
      headStyles: { fillColor: encabezado, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 11 },
        1: { cellWidth: 105 },
        2: { cellWidth: 79 },
        3: { cellWidth: 17 },
        4: { cellWidth: 17 },
        5: { cellWidth: 21 },
        6: { cellWidth: 23 },
      },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      didDrawCell: (c) => {
        if (c.section === 'body' && c.column.index === 0) alDibujarFila?.(c.row.index, c.pageNumber)
      },
    })

  /** Dibuja la tabla en segmentos: cada corte (índice de fila) empieza una hoja nueva. */
  const dibujar = (d: typeof doc, cortes: number[], alDibujarFila?: (global: number, pagina: number) => void) => {
    const limites = [0, ...cortes, body.length]
    for (let k = 0; k < limites.length - 1; k++) {
      if (k > 0) d.addPage()
      const desde = limites[k]
      opciones(d, body.slice(desde, limites[k + 1]), k === 0 ? yTabla : M, (i, pag) => alDibujarFila?.(desde + i, pag))
    }
  }

  // Un título de sección no debe quedar solo al pie de una hoja: se hace una pasada de prueba para ver dónde cae cada fila
  // y, si algún título quedó huérfano, se corta la tabla justo antes de él (se repite por si el corte genera otro caso).
  const cortes: number[] = []
  for (let intento = 0; intento < 12; intento++) {
    const prueba = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    const paginaDeFila: number[] = []
    dibujar(prueba, cortes, (g, pag) => {
      paginaDeFila[g] = pag
    })
    const huerfana = [...filasSeccion].find(
      (i) => !cortes.includes(i) && i + 1 < body.length && paginaDeFila[i + 1] !== paginaDeFila[i],
    )
    if (huerfana === undefined) break
    cortes.push(huerfana)
    cortes.sort((x, y) => x - y)
  }
  dibujar(doc, cortes)

  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(130)
    doc.text(`${a.empresaNombre} · ${a.sucursalNombre} · Auditoría N.º ${a.folio}`, M, H - 7)
    doc.text(`Página ${p} de ${paginas}`, W - M, H - 7, { align: 'right' })
  }

  doc.save(nombreArchivo(a.sucursalNombre, a.fecha, 'pdf'))
}
