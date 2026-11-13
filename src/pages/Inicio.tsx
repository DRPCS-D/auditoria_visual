import { ArrowDownRight, ArrowRight, ArrowUpRight, ClipboardCheck, FilePen } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useAuditorias } from '@/hooks/useAuditorias'
import { fechaCorta } from '@/lib/documentos/formato'
import { porcentaje } from '@/lib/puntaje'
import type { AuditoriaResumen } from '@/lib/tipos'

interface FilaSucursal {
  ultima: AuditoriaResumen
  /** Diferencia de cumplimiento contra la auditoría finalizada anterior de la misma sucursal; null si no hay. */
  variacion: number | null
}

/** Para cada sucursal, su última auditoría finalizada y cómo cambió respecto de la anterior. */
function ultimasPorSucursal(auditorias: AuditoriaResumen[]): FilaSucursal[] {
  const porSucursal = new Map<string, AuditoriaResumen[]>()
  for (const a of auditorias) {
    if (a.estado !== 'finalizada') continue
    porSucursal.set(a.sucursalId, [...(porSucursal.get(a.sucursalId) ?? []), a])
  }
  const filas: FilaSucursal[] = []
  for (const lista of porSucursal.values()) {
    // La lista ya viene de la más nueva a la más vieja.
    const [ultima, anterior] = lista
    filas.push({ ultima, variacion: anterior ? ultima.cumplimiento - anterior.cumplimiento : null })
  }
  return filas.sort((a, b) => a.ultima.cumplimiento - b.ultima.cumplimiento)
}

export default function Inicio() {
  const { nombre } = useAuth()
  const { data, loading, error } = useAuditorias()

  const borradores = useMemo(() => data.filter((a) => a.estado === 'borrador'), [data])
  const filas = useMemo(() => ultimasPorSucursal(data), [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (error) return <ErrorBox mensaje={error} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Hola, {nombre}</h1>
        <p className="text-sm text-muted-foreground">Resumen de las auditorías de tus tiendas.</p>
      </div>

      {data.length === 0 ? (
        <Vacio
          icono={ClipboardCheck}
          titulo="Todavía no hay auditorías"
          accion={
            <Link to="/auditorias" className="text-sm text-primary underline">
              Ir a Auditorías
            </Link>
          }
        />
      ) : (
        <>
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FilePen className="size-4 text-muted-foreground" /> Borradores pendientes
              <Badge tono={borradores.length ? 'warning' : 'neutral'}>{borradores.length}</Badge>
            </h2>
            {borradores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay auditorías sin terminar.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {borradores.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link to={`/auditorias/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/40">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {a.sucursalNombre} <span className="font-normal text-muted-foreground">· {a.empresaNombre}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {fechaCorta(a.fecha)} <ArrowRight className="size-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardCheck className="size-4 text-muted-foreground" /> Última auditoría por sucursal
            </h2>
            {filas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay auditorías finalizadas.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Sucursal</th>
                      <th className="px-4 py-2.5 font-medium">Fecha</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cumplimiento</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ ultima, variacion }) => (
                      <tr key={ultima.sucursalId} className="border-b border-border last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-2.5">
                          <Link to={`/auditorias/${ultima.id}`} className="font-medium text-foreground hover:underline">
                            {ultima.sucursalNombre}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">{ultima.empresaNombre}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fechaCorta(ultima.fecha)}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                          {porcentaje(ultima.cumplimiento)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {variacion === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : variacion > 0.00005 ? (
                            <span className="inline-flex items-center gap-0.5 text-success">
                              <ArrowUpRight className="size-3.5" />
                              {porcentaje(variacion)}
                            </span>
                          ) : variacion < -0.00005 ? (
                            <span className="inline-flex items-center gap-0.5 text-destructive">
                              <ArrowDownRight className="size-3.5" />
                              {porcentaje(Math.abs(variacion))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">igual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
