import { callApi, conCredenciales } from '@/lib/appsScript'
import { ejecutar, ejecutarConDatos } from '@/lib/ejecutar'
import { parchearTabla, TABLAS } from '@/lib/tablas'
import { quitarDeLista } from '@/lib/parches'
import type { Auditoria, AuditoriaResumen, Respuestas } from '@/lib/tipos'
import { useTabla } from './useTabla'

export interface DatosNuevaAuditoria {
  plantillaId: string
  sucursalId: string
  fecha: string
  auditor: string
  encargada: string
}

export interface DatosGuardarAuditoria {
  encargada: string
  auditor: string
  fecha: string
  respuestas: Respuestas
  finalizar: boolean
  /** `version` de la auditoría tal como se cargó o se guardó por última vez. */
  version: string
}

export function useAuditorias() {
  const lista = useTabla<AuditoriaResumen>(TABLAS.auditorias)

  const crear = (d: DatosNuevaAuditoria) =>
    ejecutarConDatos<{ id: string }>('createAuditoria', { ...d }, 'No se pudo crear la auditoría.')
  const eliminar = (id: string) => ejecutar('deleteAuditoria', { id }, 'No se pudo borrar la auditoría.')
  const reabrir = (id: string) => ejecutarConDatos<{ version: string }>('reabrirAuditoria', { id }, 'No se pudo reabrir la auditoría.')
  return { ...lista, crear, eliminar, reabrir }
}

/** Auditoría completa (criterios y respuestas). No pasa por la caché de tablas: se pide al abrirla. */
export async function cargarAuditoria(id: string): Promise<Auditoria> {
  const r = await callApi<{ auditoria: Auditoria }>('getAuditoria', conCredenciales({ id }))
  return r.auditoria
}

export function guardarAuditoria(id: string, d: DatosGuardarAuditoria) {
  return ejecutarConDatos<{ version: string }>('saveAuditoria', { id, ...d }, 'No se pudo guardar la auditoría.')
}

/** Cambia al instante una auditoría en la lista ya cargada, sin esperar a la descarga. */
export function parchearAuditoria(id: string, cambios: Partial<AuditoriaResumen>) {
  parchearTabla(TABLAS.auditorias, {}, (lista) =>
    (lista as AuditoriaResumen[]).map((a) => (a.id === id ? { ...a, ...cambios } : a)),
  )
}

export function quitarAuditoria(id: string) {
  parchearTabla(TABLAS.auditorias, {}, (lista) => quitarDeLista(lista as AuditoriaResumen[], id))
}
