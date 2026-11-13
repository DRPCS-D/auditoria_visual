import { Plus, Search, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SucursalFormModal } from '@/components/admin/SucursalFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas, useSucursales } from '@/hooks/useCatalogo'
import { normalizar } from '@/lib/format'
import type { Sucursal } from '@/lib/tipos'

export default function Sucursales() {
  const { esAdmin, puedeAuditar } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refetch, crear, editar, eliminar } = useSucursales()
  const { data: empresas, nombres: nombreEmpresa } = useEmpresas()

  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalForm, setModalForm] = useState<'nueva' | Sucursal | null>(null)
  const [modalBorrar, setModalBorrar] = useState<Sucursal | null>(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!puedeAuditar) navigate('/', { replace: true })
  }, [puedeAuditar, navigate])

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda)
    return data.filter(
      (s) =>
        (!filtroEmpresa || s.empresaId === filtroEmpresa) &&
        (!q || normalizar(`${s.nombre} ${s.encargada} ${s.direccion} ${nombreEmpresa.get(s.empresaId) ?? ''}`).includes(q)),
    )
  }, [data, filtroEmpresa, busqueda, nombreEmpresa])

  if (!puedeAuditar) return null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Las tiendas que se auditan.</p>
        </div>
        <Button onClick={() => setModalForm('nueva')}>
          <Plus /> Nueva
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="busqueda"
            aria-label="Buscar"
            className="pl-9"
            placeholder="Buscar sucursal, encargada…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {empresas.length > 1 && (
          <Select aria-label="Empresa" className="w-auto" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        )}
      </div>

      {loading ? (
        <TableSkeleton columnas={[25, 25, 25, 12]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : filtradas.length === 0 ? (
        data.length > 0 ? (
          <Vacio icono={Store} titulo="Sin resultados" descripcion="Prueba con otra búsqueda o filtro." />
        ) : (
          <Vacio icono={Store} titulo="Sin sucursales" descripcion="Crea una para poder hacer auditorías." />
        )
      ) : (
        <TablaScroll total={filtradas.length} clave={`${filtroEmpresa}|${busqueda}`}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Empresa</th>
                  <th className="px-4 py-2.5 font-medium">Encargada</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setModalForm(s)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setModalForm(s)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.nombre}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{nombreEmpresa.get(s.empresaId) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.encargada || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tono={s.activo ? 'success' : 'neutral'}>{s.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <SucursalFormModal
        abierto={modalForm !== null}
        sucursal={modalForm === 'nueva' ? null : modalForm}
        empresas={empresas}
        empresaInicial={filtroEmpresa || (empresas.length === 1 ? empresas[0].id : '')}
        onCerrar={() => setModalForm(null)}
        onGuardado={() => {
          setModalForm(null)
          refetch()
        }}
        onBorrar={esAdmin ? () => {
          setModalBorrar(modalForm === 'nueva' ? null : modalForm)
          setModalForm(null)
        } : undefined}
        crear={crear}
        editar={editar}
      />

      <ConfirmModal
        abierto={modalBorrar !== null}
        titulo="Borrar sucursal"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={
          <>
            ¿Borrar <strong>{modalBorrar?.nombre}</strong>? Si ya tiene auditorías, desactívala en lugar de borrarla.
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
            toast.success('Sucursal borrada.')
            refetch()
          }
          setModalBorrar(null)
        }}
      />
    </div>
  )
}
