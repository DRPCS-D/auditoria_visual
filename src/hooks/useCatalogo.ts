import { useMemo } from 'react'
import { ejecutar, ejecutarConDatos } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Empresa, Plantilla, Seccion, Sucursal } from '@/lib/tipos'
import { useTabla } from './useTabla'

export interface DatosEmpresa {
  nombre: string
  color: string
  activo: boolean
}

export function useEmpresas() {
  const lista = useTabla<Empresa>(TABLAS.empresas)
  const nombres = useMemo(() => new Map(lista.data.map((e) => [e.id, e.nombre])), [lista.data])

  const crear = (d: DatosEmpresa) => ejecutar('createEmpresa', { ...d }, 'No se pudo crear la empresa.')
  const editar = (id: string, d: DatosEmpresa) => ejecutar('updateEmpresa', { id, ...d }, 'No se pudo guardar la empresa.')
  const eliminar = (id: string) => ejecutar('deleteEmpresa', { id }, 'No se pudo borrar la empresa.')
  return { ...lista, nombres, crear, editar, eliminar }
}

export interface DatosSucursal {
  empresaId: string
  nombre: string
  encargada: string
  direccion: string
  activo: boolean
}

export function useSucursales() {
  const lista = useTabla<Sucursal>(TABLAS.sucursales)
  const nombres = useMemo(() => new Map(lista.data.map((s) => [s.id, s.nombre])), [lista.data])

  const crear = (d: DatosSucursal) => ejecutar('createSucursal', { ...d }, 'No se pudo crear la sucursal.')
  const editar = (id: string, d: DatosSucursal) => ejecutar('updateSucursal', { id, ...d }, 'No se pudo guardar la sucursal.')
  const eliminar = (id: string) => ejecutar('deleteSucursal', { id }, 'No se pudo borrar la sucursal.')
  return { ...lista, nombres, crear, editar, eliminar }
}

export interface DatosPlantilla {
  empresaId: string
  nombre: string
  codigo: string
  titulo: string
  escalaMax: number
  activo: boolean
  secciones: Seccion[]
}

export function usePlantillas() {
  const lista = useTabla<Plantilla>(TABLAS.plantillas)

  const crear = (d: DatosPlantilla) =>
    ejecutarConDatos<{ id: string }>('createPlantilla', { ...d }, 'No se pudo crear la plantilla.')
  const editar = (id: string, d: DatosPlantilla) =>
    ejecutar('updatePlantilla', { id, ...d }, 'No se pudo guardar la plantilla.')
  const eliminar = (id: string) => ejecutar('deletePlantilla', { id }, 'No se pudo borrar la plantilla.')
  return { ...lista, crear, editar, eliminar }
}
