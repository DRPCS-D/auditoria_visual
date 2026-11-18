import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FormModal } from '@/components/admin/FormModal'
import { Field, Input, Select } from '@/components/ui/field'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas, usePlantillas, useSucursales } from '@/hooks/useCatalogo'
import type { useAuditorias } from '@/hooks/useAuditorias'
import { hoyLocal } from '@/lib/format'

/** Crea una auditoría en borrador: empresa → plantilla y sucursal, fecha y responsables. */
export function NuevaAuditoriaModal({
  abierto,
  onCerrar,
  onCreada,
  crear,
}: {
  abierto: boolean
  onCerrar: () => void
  /** Recibe el id de la auditoría creada. */
  onCreada: (id: string) => void
  crear: ReturnType<typeof useAuditorias>['crear']
}) {
  const { nombre: miNombre } = useAuth()
  const { data: empresas } = useEmpresas()
  const { data: plantillas } = usePlantillas()
  const { data: sucursales } = useSucursales()

  const [empresaId, setEmpresaId] = useState('')
  const [plantillaId, setPlantillaId] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [fecha, setFecha] = useState(hoyLocal())
  const [auditor, setAuditor] = useState('')
  const [encargada, setEncargada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const empresasActivas = useMemo(() => empresas.filter((e) => e.activo), [empresas])
  const plantillasDe = useMemo(() => plantillas.filter((p) => p.activo && p.empresaId === empresaId), [plantillas, empresaId])
  const sucursalesDe = useMemo(() => sucursales.filter((s) => s.activo && s.empresaId === empresaId), [sucursales, empresaId])

  useEffect(() => {
    if (!abierto) return
    setEmpresaId(empresasActivas.length === 1 ? empresasActivas[0].id : '')
    setPlantillaId('')
    setSucursalId('')
    setFecha(hoyLocal())
    setAuditor(miNombre ?? '')
    setEncargada('')
    setError(null)
    // Solo al abrir: cargas posteriores de las tablas no deben borrar lo que el usuario ya eligió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Con una sola opción disponible se elige sola.
  useEffect(() => {
    if (!abierto) return
    if (!empresaId && empresasActivas.length === 1) setEmpresaId(empresasActivas[0].id)
  }, [abierto, empresaId, empresasActivas])
  useEffect(() => {
    if (!abierto || !empresaId) return
    if (!plantillaId && plantillasDe.length === 1) setPlantillaId(plantillasDe[0].id)
  }, [abierto, empresaId, plantillaId, plantillasDe])

  function elegirSucursal(id: string) {
    setSucursalId(id)
    setEncargada(sucursales.find((s) => s.id === id)?.encargada ?? '')
  }

  async function onGuardar() {
    if (!empresaId) return setError('Elige la empresa.')
    if (!plantillaId) return setError('Elige la plantilla.')
    if (!sucursalId) return setError('Elige la sucursal.')
    if (!fecha) return setError('Indica la fecha.')
    if (!auditor.trim()) return setError('Indica el auditor.')
    setGuardando(true)
    setError(null)
    const { error: err, data } = await crear({ plantillaId, sucursalId, fecha, auditor: auditor.trim(), encargada: encargada.trim() })
    setGuardando(false)
    if (err || !data) return setError(err ?? 'No se pudo crear la auditoría.')
    toast.success('Auditoría creada.')
    onCreada(data.id)
  }

  return (
    <FormModal
      abierto={abierto}
      titulo="Nueva auditoría"
      editando={false}
      guardando={guardando}
      error={error}
      onCerrar={onCerrar}
      onGuardar={onGuardar}
    >
      <Field label="Empresa *">
        <Select
          value={empresaId}
          onChange={(e) => {
            setEmpresaId(e.target.value)
            setPlantillaId('')
            setSucursalId('')
            setEncargada('')
          }}
        >
          <option value="">Elegir empresa…</option>
          {empresasActivas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Plantilla *"
        warning={empresaId && plantillasDe.length === 0 ? 'Esta empresa no tiene plantillas activas.' : undefined}
      >
        <Select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} disabled={!empresaId}>
          <option value="">Elegir plantilla…</option>
          {plantillasDe.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.codigo ? ` (${p.codigo})` : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Sucursal *"
        warning={empresaId && sucursalesDe.length === 0 ? 'Esta empresa no tiene sucursales activas.' : undefined}
      >
        <Select value={sucursalId} onChange={(e) => elegirSucursal(e.target.value)} disabled={!empresaId}>
          <option value="">Elegir sucursal…</option>
          {sucursalesDe.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha *">
          <Input type="date" value={fecha} disabled readOnly />
        </Field>
        <Field label="Auditor *">
          <Input value={auditor} disabled readOnly />
        </Field>
      </div>
      <Field label="Encargada" hint="Se completa con la encargada de la sucursal; puedes cambiarla.">
        <Input value={encargada} onChange={(e) => setEncargada(e.target.value)} maxLength={80} />
      </Field>
    </FormModal>
  )
}
