/**
 * Tipos del dominio. Se escriben a mano (no hay esquema que generar: el
 * backend es Apps Script sobre Google Sheets, no una base tipada).
 */

/** Coincide con lo que devuelve `normalizarRol_` en apps-script/Code.gs. */
export type Rol = 'admin' | 'auditor' | 'consulta'

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin',
  auditor: 'Auditor',
  consulta: 'Consulta',
}

export interface Empresa {
  id: string
  nombre: string
  activo: boolean
  /** '#RRGGBB': color de las barras del informe. */
  color: string
}

export interface Sucursal {
  id: string
  empresaId: string
  nombre: string
  /** Responsable de la tienda; se propone al crear una auditoría. */
  encargada: string
  direccion: string
  activo: boolean
}

/** Un criterio de evaluación (una fila del informe). */
export interface Criterio {
  id: string
  texto: string
  /** Puntaje máximo. */
  max: number
  /** Guía para quien audita (la «nota» de la celda en el Excel); opcional. */
  instrucciones?: string
}

export interface Seccion {
  id: string
  titulo: string
  items: Criterio[]
}

export interface Plantilla {
  id: string
  empresaId: string
  nombre: string
  /** Código del formato, p. ej. «AI-PL-07». */
  codigo: string
  /** Título del informe, p. ej. «INFORME DE AUDITORÍA INTERNA». */
  titulo: string
  /** Puntaje máximo propuesto para los criterios nuevos. */
  escalaMax: number
  activo: boolean
  secciones: Seccion[]
}

/** Respuesta a un criterio: `a` anterior, `p` puntaje actual, `h` hallazgo / observación. */
export interface Respuesta {
  a: number | null
  p: number | null
  h: string
}

export type Respuestas = Record<string, Respuesta>

export type EstadoAuditoria = 'borrador' | 'finalizada'

export const ESTADO_LABEL: Record<EstadoAuditoria, string> = {
  borrador: 'Borrador',
  finalizada: 'Finalizada',
}

/** Lo que devuelve `listAuditorias` (sin criterios ni respuestas, que pesan). */
export interface AuditoriaResumen {
  id: string
  folio: string
  plantillaId: string
  empresaId: string
  sucursalId: string
  empresaNombre: string
  sucursalNombre: string
  plantillaNombre: string
  encargada: string
  auditor: string
  /** 'yyyy-MM-dd' */
  fecha: string
  estado: EstadoAuditoria
  maximo: number
  obtenido: number
  /** 0 a 1 */
  cumplimiento: number
  creadoPor: string
  fechaCreacion: string
  fechaFinalizada: string
}

/** Auditoría completa (`getAuditoria`): lleva su propia copia de los criterios. */
export interface Auditoria extends AuditoriaResumen {
  color: string
  codigo: string
  titulo: string
  /** Fecha de la auditoría de la que salen los puntajes «Anterior»; vacía si no hubo. */
  anteriorFecha: string
  /** Huella del contenido guardado: se devuelve al guardar para detectar que otro dispositivo guardó antes. */
  version: string
  secciones: Seccion[]
  respuestas: Respuestas
}

export interface UsuarioApp {
  /** Nombre de acceso (login). */
  usuario: string
  /** Nombre completo, opcional. */
  nombre: string
  rol: Rol
  activo: boolean
  /** Ids de empresa a las que accede; vacío = todas. */
  empresas: string[]
}
