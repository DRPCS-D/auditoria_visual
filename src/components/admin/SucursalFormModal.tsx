import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Field, Input, Select } from '@/components/ui/field'
import type { DatosSucursal } from '@/hooks/useCatalogo'
import type { Empresa, Sucursal } from '@/lib/tipos'
import { FormModal } from './FormModal'

export function SucursalFormModal({
  abierto,
  sucursal,
  empresas,
  empresaInicial,
  onCerrar,
  onGuardado,
  onBorrar,
  crear,
  editar,
}: {
  abierto: boolean
  sucursal: Sucursal | null
  empresas: Empresa[]
  /** Empresa preseleccionada al crear. */
  empresaInicial: string
  onCerrar: () => void
  onGuardado: () => void
  onBorrar: () => void
  crear: (d: DatosSucursal) => Promise<{ error: string | null }>
  editar: (id: string, d: DatosSucursal) => Promise<{ error: string | null }>
}) {
  const [empresaId, setEmpresaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [encargada, setEncargada] = useState('')
  const [direccion, setDireccion] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setEmpresaId(sucursal?.empresaId ?? empresaInicial)
    setNombre(sucursal?.nombre ?? '')
    setEncargada(sucursal?.encargada ?? '')
    setDireccion(sucursal?.direccion ?? '')
    setActivo(sucursal?.activo ?? true)
    setError(null)
  }, [abierto, sucursal, empresaInicial])

  async function onGuardar() {
    if (!empresaId) return setError('Elige la empresa.')
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    setGuardando(true)
    setError(null)
    const datos = { empresaId, nombre: nombre.trim(), encargada: encargada.trim(), direccion: direccion.trim(), activo }
    const { error: err } = sucursal ? await editar(sucursal.id, datos) : await crear(datos)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(sucursal ? 'Sucursal actualizada.' : 'Sucursal creada.')
    onGuardado()
  }

  const opciones = empresas.filter((e) => e.activo || e.id === empresaId)

  return (
    <FormModal
      abierto={abierto}
      titulo={sucursal ? 'Editar sucursal' : 'Nueva sucursal'}
      editando={!!sucursal}
      guardando={guardando}
      error={error}
      onCerrar={onCerrar}
      onGuardar={onGuardar}
      onBorrar={onBorrar}
    >
      <Field label="Empresa *">
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Elegir empresa…</option>
          {opciones.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nombre *">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoFocus />
      </Field>
      <Field label="Encargada" hint="Se propone al crear una auditoría de esta sucursal.">
        <Input value={encargada} onChange={(e) => setEncargada(e.target.value)} maxLength={80} />
      </Field>
      <Field label="Dirección">
        <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={150} />
      </Field>
      {sucursal && (
        <Field label="Estado" hint="Una sucursal inactiva no admite auditorías nuevas.">
          <Select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')}>
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </Select>
        </Field>
      )}
    </FormModal>
  )
}
