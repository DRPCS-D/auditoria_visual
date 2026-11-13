import { callApi, conCredenciales } from '@/lib/appsScript'
import { ejecutar, ejecutarConDatos } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
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
}

export function useAuditorias() {
  const lista = useTabla<AuditoriaResumen>(TABLAS.auditorias)

  const crear = (d: DatosNuevaAuditoria) =>
    ejecutarConDatos<{ id: string }>('createAuditoria', { ...d }, 'No se pudo crear la auditoría.')
  const eliminar = (id: string) => ejecutar('deleteAuditoria', { id }, 'No se pudo borrar la auditoría.')
  const reabrir = (id: string) => ejecutar('reabrirAuditoria', { id }, 'No se pudo reabrir la auditoría.')
  return { ...lista, crear, eliminar, reabrir }
}

/** Auditoría completa (criterios y respuestas). No pasa por la caché de tablas: se pide al abrirla. */
export async function cargarAuditoria(id: string): Promise<Auditoria> {
  const r = await callApi<{ auditoria: Auditoria }>('getAuditoria', conCredenciales({ id }))
  return r.auditoria
}

export function guardarAuditoria(id: string, d: DatosGuardarAuditoria) {
  return ejecutar('saveAuditoria', { id, ...d }, 'No se pudo guardar la auditoría.')
}
