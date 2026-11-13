/** Mueve el elemento `i` una posición hacia arriba (-1) o hacia abajo (+1). Devuelve la misma lista si no se puede. */
export function mover<T>(lista: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (i < 0 || j < 0 || i >= lista.length || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

/** Id corto para secciones y criterios nuevos (el backend acepta 1 a 12 caracteres a-z 0-9). */
export function idNuevo(): string {
  return 'x' + Math.random().toString(36).slice(2, 9).padEnd(7, '0')
}
