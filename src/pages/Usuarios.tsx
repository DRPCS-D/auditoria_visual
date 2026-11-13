import { Plus, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UsuarioFormModal } from '@/components/admin/UsuarioFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Input } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas } from '@/hooks/useCatalogo'
import { useUsuarios } from '@/hooks/useUsuarios'
import { normalizar } from '@/lib/format'
import { ROL_LABEL, type UsuarioApp } from '@/lib/tipos'

export default function Usuarios() {
  const { esAdmin, usuario: usuarioActual, actualizarNombreSesion } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!esAdmin) navigate('/', { replace: true })
  }, [esAdmin, navigate])

  const { data, loading, error, refetch, crear, editar, eliminar } = useUsuarios()
  const { data: empresas, nombres: nombreEmpresa } = useEmpresas()
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return data
    return data.filter((u) => normalizar(`${u.usuario} ${u.nombre}`).includes(q))
  }, [data, busqueda])

  const [modalForm, setModalForm] = useState<'nuevo' | UsuarioApp | null>(null)
  const [modalBorrar, setModalBorrar] = useState<UsuarioApp | null>(null)
  const [borrando, setBorrando] = useState(false)

  if (!esAdmin) return null

  const editando = modalForm === 'nuevo' ? null : modalForm
  const esYo = (u: UsuarioApp | null) => !!u && u.usuario.toUpperCase() === usuarioActual?.toUpperCase()

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Quiénes usan el sistema y a qué empresas acceden.</p>
        </div>
        <Button onClick={() => setModalForm('nuevo')}>
          <Plus /> Nuevo
        </Button>
      </div>

      {loading ? (
        <Skeleton className="mb-4 h-9.5 max-w-sm" />
      ) : (
        data.length > 0 && (
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="busqueda"
              aria-label="Buscar"
              className="pl-9"
              placeholder="Buscar por usuario o nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        )
      )}

      {loading ? (
        <TableSkeleton columnas={[22, 25, 15, 25, 12]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio icono={UserRound} titulo="Sin usuarios" />
      ) : filtrados.length === 0 ? (
        <Vacio icono={UserRound} titulo="Sin resultados" descripcion="Prueba con otra búsqueda." />
      ) : (
        <TablaScroll total={filtrados.length} clave={busqueda}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Usuario</th>
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Rol</th>
                  <th className="px-4 py-2.5 font-medium">Empresas</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, limite).map((u) => (
                  <tr
                    key={u.usuario}
                    onClick={() => setModalForm(u)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setModalForm(u)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {u.usuario}
                      {esYo(u) && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{u.nombre || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{ROL_LABEL[u.rol]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {u.rol === 'admin' || u.empresas.length === 0
                        ? 'Todas'
                        : u.empresas.map((id) => nombreEmpresa.get(id) ?? id).join(', ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <UsuarioFormModal
        abierto={modalForm !== null}
        usuario={editando}
        empresas={empresas}
        puedeBorrar={!esYo(editando)}
        onCerrar={() => setModalForm(null)}
        onGuardado={(nombreFinal) => {
          // Si te renombraste a ti mismo hay que actualizar la sesión local: el backend ya no reconoce el nombre viejo.
          if (esYo(editando)) actualizarNombreSesion(nombreFinal)
          setModalForm(null)
          refetch()
        }}
        onBorrar={() => {
          setModalBorrar(editando)
          setModalForm(null)
        }}
        crear={crear}
        editar={editar}
      />

      <ConfirmModal
        abierto={modalBorrar !== null}
        titulo="Borrar usuario"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={
          <>
            ¿Borrar el usuario <strong>{modalBorrar?.usuario}</strong>? No podrá volver a iniciar sesión.
          </>
        }
        onCancelar={() => setModalBorrar(null)}
        onConfirmar={async () => {
          if (!modalBorrar) return
          setBorrando(true)
          const { error: err } = await eliminar(modalBorrar.usuario)
          setBorrando(false)
          if (err) toast.error(err)
          else {
            toast.success('Usuario borrado.')
            refetch()
          }
          setModalBorrar(null)
        }}
      />
    </div>
  )
}
