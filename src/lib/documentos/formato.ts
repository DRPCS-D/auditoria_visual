const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

/** '2026-11-11' → 'NOVIEMBRE 2026'. Vacío si la fecha no es válida. */
export function mesAnio(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha)
  if (!m) return ''
  const nombre = MESES[Number(m[2]) - 1]
  return nombre ? `${nombre} ${m[1]}` : ''
}

/** '2026-11-11' → '11/11/2026'. */
export function fechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha
}

export type RGB = [number, number, number]

/** '#193B59' → [25, 59, 89]. Si no es un color válido devuelve el azul por defecto. */
export function hexARgb(hex: string): RGB {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return [25, 59, 89]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/** Aclara un color mezclándolo con blanco (`cantidad` de 0 a 1). */
export function aclarar([r, g, b]: RGB, cantidad: number): RGB {
  const f = (c: number) => Math.round(c + (255 - c) * cantidad)
  return [f(r), f(g), f(b)]
}

/** Nombre de archivo seguro: 'Auditoria_PATA-MATRIZ_2026-11-11.pdf'. */
export function nombreArchivo(sucursal: string, fecha: string, extension: string): string {
  const limpio = sucursal
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `Auditoria_${limpio || 'sucursal'}_${fecha || 'sin-fecha'}.${extension}`
}
