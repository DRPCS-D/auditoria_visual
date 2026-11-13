import { Building2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EmpresaFormModal } from '@/components/admin/EmpresaFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { ConfirmModal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas } from '@/hooks/useCatalogo'
import type { Empresa } from '@/lib/tipos'

export default function Empresas() {
  const { esAdmin } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refetch, crear, editar, eliminar } = useEmpresas()

  const [modalForm, setModalForm] = useState<'nueva' | Empresa | null>(null)
  const [modalBorrar, setModalBorrar] = useState<Empresa | null>(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!esAdmin) navigate('/', { replace: true })
  }, [esAdmin, navigate])

  if (!esAdmin) return null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Cada empresa tiene sus sucursales y sus plantillas de auditoría.</p>
        </div>
        <Button onClick={() => setModalForm('nueva')}>
          <Plus /> Nueva
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columnas={[50, 15, 15]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio icono={Building2} titulo="Sin empresas todavía" descripcion="Crea una para poder armar plantillas y sucursales." />
      ) : (
        <TablaScroll total={data.length} clave="">
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Color</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, limite).map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setModalForm(e)}
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        setModalForm(e)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.nombre}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block size-5 rounded border border-border align-middle" style={{ background: e.color }} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={e.activo ? 'success' : 'neutral'}>{e.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <EmpresaFormModal
        abierto={modalForm !== null}
        empresa={modalForm === 'nueva' ? null : modalForm}
        onCerrar={() => setModalForm(null)}
        onGuardado={() => {
          setModalForm(null)
          refetch()
        }}
        onBorrar={() => {
          setModalBorrar(modalForm === 'nueva' ? null : modalForm)
          setModalForm(null)
        }}
        crear={crear}
        editar={editar}
      />

      <ConfirmModal
        abierto={modalBorrar !== null}
        titulo="Borrar empresa"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={
          <>
            ¿Borrar <strong>{modalBorrar?.nombre}</strong>? Si ya tiene sucursales, plantillas o auditorías, desactívala en lugar de borrarla.
          </>
        }
        onCancelar={() => setModalBorrar(null)}
        onConfirmar={async () => {
          if (!modalBorrar) return
          setBorrando(true)
          const { error: err } = await eliminar(modalBorrar.id)
          setBorrando(false)
          if (err) toast.error(err)
          else {
            toast.success('Empresa borrada.')
            refetch()
          }
          setModalBorrar(null)
        }}
      />
    </div>
  )
}
