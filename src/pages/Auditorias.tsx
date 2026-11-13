import { ClipboardCheck, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NuevaAuditoriaModal } from '@/components/auditorias/NuevaAuditoriaModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useAuditorias } from '@/hooks/useAuditorias'
import { useEmpresas } from '@/hooks/useCatalogo'
import { sincronizar } from '@/lib/tablas'
import { fechaCorta } from '@/lib/documentos/formato'
import { normalizar } from '@/lib/format'
import { porcentaje } from '@/lib/puntaje'
import { ESTADO_LABEL, type EstadoAuditoria } from '@/lib/tipos'

export default function Auditorias() {
  const { puedeAuditar } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, crear } = useAuditorias()
  const { data: empresas } = useEmpresas()

  const [empresaId, setEmpresaId] = useState('')
  const [estado, setEstado] = useState<'' | EstadoAuditoria>('')
  const [busqueda, setBusqueda] = useState('')
  const [modalNueva, setModalNueva] = useState(false)

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda)
    return data.filter(
      (a) =>
        (!empresaId || a.empresaId === empresaId) &&
        (!estado || a.estado === estado) &&
        (!q || normalizar(`${a.sucursalNombre} ${a.auditor} ${a.encargada} ${a.folio}`).includes(q)),
    )
  }, [data, empresaId, estado, busqueda])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Auditorías</h1>
          <p className="text-sm text-muted-foreground">Control de tiendas: puntajes por criterio e informe en PDF.</p>
        </div>
        {puedeAuditar && (
          <Button onClick={() => setModalNueva(true)}>
            <Plus /> Nueva auditoría
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="busqueda"
            aria-label="Buscar"
            className="pl-9"
            placeholder="Buscar sucursal, auditor…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {empresas.length > 1 && (
          <Select aria-label="Empresa" className="w-auto" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        )}
        <Select aria-label="Estado" className="w-auto" value={estado} onChange={(e) => setEstado(e.target.value as '' | EstadoAuditoria)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borradores</option>
          <option value="finalizada">Finalizadas</option>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton columnas={[12, 8, 22, 18, 18, 12, 10]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio
          icono={ClipboardCheck}
          titulo="Sin auditorías todavía"
          descripcion={puedeAuditar ? 'Crea la primera con «Nueva auditoría».' : undefined}
        />
      ) : filtradas.length === 0 ? (
        <Vacio icono={ClipboardCheck} titulo="Sin resultados" descripcion="Prueba con otros filtros." />
      ) : (
        <TablaScroll total={filtradas.length} clave={`${empresaId}|${estado}|${busqueda}`}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">N.º</th>
                  <th className="px-4 py-2.5 font-medium">Sucursal</th>
                  <th className="px-4 py-2.5 font-medium">Empresa</th>
                  <th className="px-4 py-2.5 font-medium">Auditor</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cumplimiento</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/auditorias/${a.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/auditorias/${a.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-foreground">{fechaCorta(a.fecha)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{a.folio}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{a.sucursalNombre || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.empresaNombre || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.auditor || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                      {a.estado === 'finalizada' || a.obtenido > 0 ? porcentaje(a.cumplimiento) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={a.estado === 'finalizada' ? 'success' : 'warning'}>{ESTADO_LABEL[a.estado]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <NuevaAuditoriaModal
        abierto={modalNueva}
        onCerrar={() => setModalNueva(false)}
        onCreada={(id) => {
          setModalNueva(false)
          void sincronizar()
          navigate(`/auditorias/${id}`)
        }}
        crear={crear}
      />
    </div>
  )
}
