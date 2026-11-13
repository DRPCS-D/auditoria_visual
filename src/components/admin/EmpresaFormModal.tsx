import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Field, Input, Select } from '@/components/ui/field'
import type { DatosEmpresa } from '@/hooks/useCatalogo'
import type { Empresa } from '@/lib/tipos'
import { FormModal } from './FormModal'

export function EmpresaFormModal({
  abierto,
  empresa,
  onCerrar,
  onGuardado,
  onBorrar,
  crear,
  editar,
}: {
  abierto: boolean
  empresa: Empresa | null
  onCerrar: () => void
  onGuardado: () => void
  /** Sin esta función no se ofrece Borrar (solo el Admin borra). */
  onBorrar?: () => void
  crear: (d: DatosEmpresa) => Promise<{ error: string | null }>
  editar: (id: string, d: DatosEmpresa) => Promise<{ error: string | null }>
}) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#193b59')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setNombre(empresa?.nombre ?? '')
    setColor(empresa?.color ?? '#193b59')
    setActivo(empresa?.activo ?? true)
    setError(null)
  }, [abierto, empresa])

  async function onGuardar() {
    const n = nombre.trim()
    if (!n) return setError('El nombre es obligatorio.')
    setGuardando(true)
    setError(null)
    const datos = { nombre: n, color, activo }
    const { error: err } = empresa ? await editar(empresa.id, datos) : await crear(datos)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(empresa ? 'Empresa actualizada.' : 'Empresa creada.')
    onGuardado()
  }

  return (
    <FormModal
      abierto={abierto}
      titulo={empresa ? 'Editar empresa' : 'Nueva empresa'}
      editando={!!empresa}
      guardando={guardando}
      error={error}
      onCerrar={onCerrar}
      onGuardar={onGuardar}
      onBorrar={onBorrar}
    >
      <Field label="Nombre *">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoFocus />
      </Field>
      <Field label="Color del informe" hint="Color de las barras del PDF.">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9.5 w-20 cursor-pointer rounded-md border border-input bg-card p-1"
        />
      </Field>
      {empresa && (
        <Field label="Estado" hint="Una empresa inactiva no admite auditorías nuevas.">
          <Select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')}>
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </Select>
        </Field>
      )}
    </FormModal>
  )
}
