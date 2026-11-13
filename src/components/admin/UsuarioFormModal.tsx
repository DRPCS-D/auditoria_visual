import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Field, Input, Select } from '@/components/ui/field'
import type { useUsuarios } from '@/hooks/useUsuarios'
import { ROL_LABEL, type Empresa, type Rol, type UsuarioApp } from '@/lib/tipos'
import { FormModal } from './FormModal'

const ROLES: Rol[] = ['auditor', 'consulta', 'admin']

/** Alta (usuario = null) y edición de usuarios. */
export function UsuarioFormModal({
  abierto,
  usuario,
  empresas,
  puedeBorrar,
  onCerrar,
  onGuardado,
  onBorrar,
  crear,
  editar,
}: {
  abierto: boolean
  usuario: UsuarioApp | null
  empresas: Empresa[]
  /** false para el propio usuario: no puede borrarse a sí mismo (también lo rechaza el backend). */
  puedeBorrar: boolean
  onCerrar: () => void
  /** Recibe el nombre final (puede haber cambiado si se renombró). */
  onGuardado: (nombreFinal: string) => void
  onBorrar: () => void
  crear: ReturnType<typeof useUsuarios>['crear']
  editar: ReturnType<typeof useUsuarios>['editar']
}) {
  const [nombre, setNombre] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('auditor')
  const [emp, setEmp] = useState<string[]>([])
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setNombre(usuario?.usuario ?? '')
    setNombreCompleto(usuario?.nombre ?? '')
    setPassword('')
    setRol(usuario?.rol ?? 'auditor')
    setEmp(usuario?.empresas ?? [])
    setActivo(usuario?.activo ?? true)
    setError(null)
  }, [abierto, usuario])

  async function onGuardar() {
    if (!nombre.trim()) return setError('El nombre de usuario es obligatorio.')
    if (!usuario && !password) return setError('La contraseña inicial es obligatoria.')
    setGuardando(true)
    setError(null)
    const empresasFinal = rol === 'admin' ? [] : emp
    let err: string | null
    let nombreFinal = nombre.trim()
    if (usuario) {
      const r = await editar(usuario.usuario, {
        rol,
        activo,
        empresas: empresasFinal,
        nombre: nombreCompleto.trim(),
        nuevoUsuario: nombre.trim(),
        nuevaPassword: password,
      })
      err = r.error
      if (r.usuario) nombreFinal = r.usuario
    } else {
      err = (
        await crear({ usuario: nombre.trim(), nombre: nombreCompleto.trim(), password, rol, activo: true, empresas: empresasFinal })
      ).error
    }
    setGuardando(false)
    if (err) return setError(err)
    toast.success(usuario ? 'Datos actualizados.' : 'Usuario creado.')
    onGuardado(nombreFinal)
  }

  const opciones = empresas.filter((e) => e.activo || emp.includes(e.id))

  return (
    <FormModal
      abierto={abierto}
      titulo={usuario ? `Editar — ${usuario.usuario}` : 'Nuevo usuario'}
      editando={!!usuario}
      guardando={guardando}
      error={error}
      onCerrar={onCerrar}
      onGuardar={onGuardar}
      onBorrar={puedeBorrar ? onBorrar : undefined}
    >
      <Field label="Usuario *" hint="No distingue mayúsculas/minúsculas.">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" autoFocus />
      </Field>
      <Field label="Nombre completo" hint="Se muestra en la app y se propone como auditor.">
        <Input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} maxLength={80} />
      </Field>
      <Field label={usuario ? 'Nueva contraseña' : 'Contraseña inicial *'} hint={usuario ? 'Dejar vacío para no cambiarla.' : undefined}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Rol" hint="Auditor: hace auditorías. Consulta: solo ve y descarga informes. Admin: todo.">
        <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>
      {rol !== 'admin' && (
        <Field label="Empresas a las que accede" hint="Sin marcar ninguna accede a todas.">
          {opciones.length === 0 ? (
            <p className="text-xs text-muted-foreground">Primero crea empresas.</p>
          ) : (
            <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-md border border-input p-2 sm:grid-cols-2">
              {opciones.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={emp.includes(e.id)}
                    onChange={(ev) => setEmp(ev.target.checked ? [...emp, e.id] : emp.filter((id) => id !== e.id))}
                  />
                  {e.nombre}
                </label>
              ))}
            </div>
          )}
        </Field>
      )}
      {usuario && (
        <Field label="Estado">
          <Select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')}>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </Select>
        </Field>
      )}
    </FormModal>
  )
}
