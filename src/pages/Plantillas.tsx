import { ClipboardList, Copy, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Select } from '@/components/ui/field'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas, usePlantillas } from '@/hooks/useCatalogo'
import type { Plantilla } from '@/lib/tipos'

const contarCriterios = (p: Plantilla) => p.secciones.reduce((n, s) => n + s.items.length, 0)

export default function Plantillas() {
  const { esAdmin } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, crear } = usePlantillas()
  const { data: empresas, nombres: nombreEmpresa } = useEmpresas()

  const [filtroEmpresa, setFiltroEmpresa] = useState('')

  useEffect(() => {
    if (!esAdmin) navigate('/', { replace: true })
  }, [esAdmin, navigate])

  const filtradas = useMemo(
    () => (filtroEmpresa ? data.filter((p) => p.empresaId === filtroEmpresa) : data),
    [data, filtroEmpresa],
  )

  if (!esAdmin) return null

  async function duplicar(p: Plantilla) {
    const { error: err, data: r } = await crear({
      empresaId: p.empresaId,
      nombre: `${p.nombre} (copia)`.slice(0, 80),
      codigo: p.codigo,
      titulo: p.titulo,
      escalaMax: p.escalaMax,
      activo: p.activo,
      secciones: p.secciones,
    })
    if (err || !r) return toast.error(err ?? 'No se pudo duplicar la plantilla.')
    toast.success('Plantilla duplicada.')
    navigate(`/plantillas/${r.id}`)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Plantillas</h1>
          <p className="text-sm text-muted-foreground">Los criterios de cada auditoría, por empresa.</p>
        </div>
        <Link to="/plantillas/nueva">
          <Button>
            <Plus /> Nueva
          </Button>
        </Link>
      </div>

      {empresas.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select aria-label="Empresa" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </div>
      )}

      {loading ? (
        <TableSkeleton columnas={[30, 20, 12, 12, 12]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : filtradas.length === 0 ? (
        <Vacio icono={ClipboardList} titulo="Sin plantillas" descripcion="Crea una plantilla para poder hacer auditorías." />
      ) : (
        <TablaScroll total={filtradas.length} clave={filtroEmpresa}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Plantilla</th>
                  <th className="px-4 py-2.5 font-medium">Empresa</th>
                  <th className="px-4 py-2.5 font-medium">Código</th>
                  <th className="px-4 py-2.5 text-right font-medium">Criterios</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/plantillas/${p.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{nombreEmpresa.get(p.empresaId) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.codigo || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {contarCriterios(p)} en {p.secciones.length} secciones
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void duplicar(p)
                        }}
                        title="Duplicar plantilla"
                      >
                        <Copy /> Duplicar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

    </div>
  )
}
