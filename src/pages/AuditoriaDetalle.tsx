import { ArrowLeft, CheckCircle2, FileDown, Info, Lock, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, type TonoBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox } from '@/components/ui/estado'
import { Field, Input, Textarea } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { cargarAuditoria, guardarAuditoria, parchearAuditoria, quitarAuditoria } from '@/hooks/useAuditorias'
import { ejecutar } from '@/lib/ejecutar'
import { fechaCorta } from '@/lib/documentos/formato'
import { numero, porcentaje, resumir, tendencia, type Tendencia } from '@/lib/puntaje'
import { sincronizar } from '@/lib/tablas'
import type { Auditoria, Criterio, Respuesta, Respuestas } from '@/lib/tipos'
import { cn } from '@/lib/utils'

const TONO_TENDENCIA: Record<Exclude<Tendencia, ''>, TonoBadge> = {
  MEJORA: 'success',
  BAJA: 'danger',
  EXCELENTE: 'primary',
  IGUAL: 'neutral',
}

const vacia: Respuesta = { a: null, p: null, h: '' }

/** '' → null; texto → número limitado a 0..max. */
function leerNumero(valor: string, max: number): number | null {
  if (valor.trim() === '') return null
  const n = Number(valor.replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(0, n))
}

export default function AuditoriaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { puedeAuditar, esAdmin } = useAuth()

  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [encargada, setEncargada] = useState('')
  const [auditor, setAuditor] = useState('')
  const [fecha, setFecha] = useState('')
  const [sucio, setSucio] = useState(false)
  const [trabajando, setTrabajando] = useState<'guardar' | 'finalizar' | 'pdf' | 'reabrir' | 'borrar' | null>(null)
  const [confirmar, setConfirmar] = useState<'finalizar' | 'borrar' | 'reabrir' | null>(null)

  const aplicar = useCallback((a: Auditoria) => {
    setAuditoria(a)
    setRespuestas(a.respuestas)
    setEncargada(a.encargada)
    setAuditor(a.auditor)
    setFecha(a.fecha)
    setSucio(false)
  }, [])

  const cargar = useCallback(async () => {
    if (!id) return
    try {
      aplicar(await cargarAuditoria(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la auditoría.')
    }
  }, [id, aplicar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return
    const f = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sucio])

  const resumen = useMemo(() => (auditoria ? resumir(auditoria.secciones, respuestas) : null), [auditoria, respuestas])

  if (error) {
    return (
      <div>
        <ErrorBox mensaje={error} />
        <Link to="/auditorias" className="mt-3 inline-block text-sm text-primary underline">
          Volver a auditorías
        </Link>
      </div>
    )
  }
  if (!auditoria || !resumen) return <Cargando />

  const editable = puedeAuditar && auditoria.estado === 'borrador'

  const cambiar = (item: Criterio, parche: Partial<Respuesta>) => {
    setRespuestas((r) => ({ ...r, [item.id]: { ...(r[item.id] ?? vacia), ...parche } }))
    setSucio(true)
  }

  async function guardar(finalizar: boolean) {
    if (!auditoria || !resumen) return false
    setTrabajando(finalizar ? 'finalizar' : 'guardar')
    const { error: err } = await guardarAuditoria(auditoria.id, {
      encargada: encargada.trim(),
      auditor: auditor.trim(),
      fecha,
      respuestas,
      finalizar,
    })
    setTrabajando(null)
    if (err) {
      toast.error(err)
      return false
    }
    toast.success(finalizar ? 'Auditoría finalizada.' : 'Borrador guardado.')
    // Se refleja al instante lo que ya se sabe (sin volver a descargar nada) y la sincronización sigue en segundo plano.
    const nuevoEstado = finalizar ? 'finalizada' : auditoria.estado
    setAuditoria({ ...auditoria, encargada: encargada.trim(), auditor: auditor.trim(), fecha, respuestas, estado: nuevoEstado })
    setSucio(false)
    parchearAuditoria(auditoria.id, {
      encargada: encargada.trim(),
      auditor: auditor.trim(),
      fecha,
      estado: nuevoEstado,
      maximo: resumen.maximo,
      obtenido: resumen.obtenido,
      cumplimiento: resumen.cumplimiento,
    })
    void sincronizar()
    return true
  }

  async function descargarPdf() {
    if (!auditoria) return
    setTrabajando('pdf')
    try {
      // El PDF sale de lo que se ve en pantalla (aunque no esté guardado), no de lo último guardado.
      const { descargarInformePdf } = await import('@/lib/documentos/pdf')
      await descargarInformePdf({ ...auditoria, encargada, auditor, fecha, respuestas })
    } catch {
      toast.error('No se pudo generar el PDF.')
    } finally {
      setTrabajando(null)
    }
  }

  async function accion(que: 'reabrir' | 'borrar') {
    if (!auditoria) return
    setTrabajando(que)
    const { error: err } = await ejecutar(
      que === 'reabrir' ? 'reabrirAuditoria' : 'deleteAuditoria',
      { id: auditoria.id },
      'No se pudo completar la acción.',
    )
    setTrabajando(null)
    setConfirmar(null)
    if (err) return toast.error(err)
    if (que === 'borrar') quitarAuditoria(auditoria.id)
    else parchearAuditoria(auditoria.id, { estado: 'borrador' })
    void sincronizar()
    if (que === 'borrar') {
      toast.success('Auditoría borrada.')
      setSucio(false)
      navigate('/auditorias', { replace: true })
    } else {
      toast.success('Auditoría reabierta.')
      setAuditoria((a) => (a ? { ...a, estado: 'borrador' } : a))
    }
  }

  const puedeBorrar = esAdmin || (puedeAuditar && auditoria.estado === 'borrador')
  const hayAnterior = auditoria.anteriorFecha !== ''

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/auditorias" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Auditorías
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {auditoria.sucursalNombre} <span className="font-normal text-muted-foreground">· {auditoria.empresaNombre}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {auditoria.plantillaNombre}
            {auditoria.codigo && ` (${auditoria.codigo})`} · N.º {auditoria.folio}{' '}
            <Badge tono={auditoria.estado === 'finalizada' ? 'success' : 'warning'}>
              {auditoria.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={descargarPdf} disabled={trabajando !== null}>
            <FileDown /> {trabajando === 'pdf' ? 'Generando…' : 'Descargar PDF'}
          </Button>
          {esAdmin && auditoria.estado === 'finalizada' && (
            <Button variant="outline" onClick={() => setConfirmar('reabrir')} disabled={trabajando !== null}>
              <RotateCcw /> Reabrir
            </Button>
          )}
          {puedeBorrar && (
            <Button variant="outline" onClick={() => setConfirmar('borrar')} disabled={trabajando !== null}>
              <Trash2 className="text-destructive" /> Borrar
            </Button>
          )}
        </div>
      </div>

      {!editable && auditoria.estado === 'finalizada' && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Auditoría finalizada: solo lectura{esAdmin ? ' (puedes reabrirla)' : ''}.
        </p>
      )}

      <div className="mb-5 grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="Encargada">
          <Input value={encargada} disabled={!editable} maxLength={80} onChange={(e) => (setEncargada(e.target.value), setSucio(true))} />
        </Field>
        <Field label="Auditor">
          <Input value={auditor} disabled={!editable} maxLength={80} onChange={(e) => (setAuditor(e.target.value), setSucio(true))} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} disabled={!editable} onChange={(e) => (setFecha(e.target.value), setSucio(true))} />
        </Field>
      </div>

      {hayAnterior && (
        <p className="mb-3 text-xs text-muted-foreground">
          «Anterior» viene de la auditoría del {fechaCorta(auditoria.anteriorFecha)} de esta sucursal.
        </p>
      )}

      <div className="space-y-5">
        {auditoria.secciones.map((s, i) => {
          const r = resumen.secciones[i]
          return (
            <section key={s.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <header
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: auditoria.color }}
              >
                <span>
                  {i + 1}. {s.titulo}
                </span>
                <span className="text-xs font-medium tabular-nums opacity-90">
                  {editable && s.items.some((it) => (respuestas[it.id]?.p ?? null) === null) && (
                    <span className="mr-2 rounded-full bg-warning px-2 py-0.5 text-[11px] text-black">
                      Faltan {s.items.filter((it) => (respuestas[it.id]?.p ?? null) === null).length}
                    </span>
                  )}
                  {numero(r.obtenido)} / {numero(r.maximo)} · {porcentaje(r.cumplimiento)}
                </span>
              </header>
              <div className="divide-y divide-border">
                {s.items.map((it, j) => {
                  const resp = respuestas[it.id] ?? vacia
                  const t = tendencia(resp.a, resp.p, it.max)
                  return (
                    <div
                      key={it.id}
                      id={`crit-${it.id}`}
                      className={cn(
                        'grid scroll-mt-20 gap-3 border-l-4 px-4 py-3 md:grid-cols-[2rem_minmax(0,1fr)_auto]',
                        editable && resp.p === null ? 'border-warning bg-warning/10' : 'border-transparent',
                      )}
                    >
                      <span className="hidden pt-0.5 text-right text-xs tabular-nums text-muted-foreground md:block">{j + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="mr-1.5 text-xs tabular-nums text-muted-foreground md:hidden">{j + 1}.</span>
                          {it.texto}
                        </p>
                        {editable && resp.p === null && (
                          <p className="mt-0.5 text-xs font-medium text-warning">Sin calificar</p>
                        )}
                        {it.instrucciones && (
                          <details className="group mt-1 text-xs">
                            <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-primary hover:underline">
                              <Info className="size-3.5" /> Instrucciones
                            </summary>
                            <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-secondary/60 p-2 text-muted-foreground">
                              {it.instrucciones}
                            </p>
                          </details>
                        )}
                        {editable ? (
                          <Textarea
                            aria-label={`Hallazgo del criterio ${i + 1}.${j + 1}`}
                            className="mt-2 min-h-10 text-xs"
                            rows={1}
                            maxLength={1000}
                            placeholder="Hallazgo / observación (opcional)"
                            value={resp.h}
                            onChange={(e) => cambiar(it, { h: e.target.value })}
                          />
                        ) : (
                          resp.h && <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">{resp.h}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 md:justify-end">
                        <div className="text-[11px] text-muted-foreground">
                          Anterior
                          <p className="mt-0.5 flex h-8 w-16 items-center justify-center rounded-md border border-border bg-secondary text-sm tabular-nums text-foreground">
                            {resp.a ?? '—'}
                          </p>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Puntaje (máx. {numero(it.max)})
                          <PuntajeInput item={it} valor={resp.p} editable={editable} onChange={(p) => cambiar(it, { p })} />
                        </div>
                        <div className="w-20 text-center">{t && <Badge tono={TONO_TENDENCIA[t]}>{t}</Badge>}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold tabular-nums text-foreground">
              {numero(resumen.obtenido)} / {numero(resumen.maximo)}
            </span>{' '}
            <span className={cn('font-semibold tabular-nums', resumen.cumplimiento >= 0.9 ? 'text-success' : 'text-warning')}>
              {porcentaje(resumen.cumplimiento)}
            </span>
            {editable && resumen.sinPuntuar > 0 && (
              <button
                type="button"
                className="ml-2 text-xs font-medium text-warning underline"
                onClick={() => {
                  const primero = auditoria.secciones.flatMap((s) => s.items).find((it) => (respuestas[it.id]?.p ?? null) === null)
                  if (primero) document.getElementById(`crit-${primero.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
                Faltan {resumen.sinPuntuar} por puntuar · ir al primero
              </button>
            )}
            {sucio && <span className="ml-2 text-xs text-warning">Cambios sin guardar</span>}
          </div>
          {editable && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => guardar(false)} disabled={trabajando !== null || !sucio}>
                <Save /> {trabajando === 'guardar' ? 'Guardando…' : 'Guardar borrador'}
              </Button>
              <Button onClick={() => setConfirmar('finalizar')} disabled={trabajando !== null}>
                <CheckCircle2 /> Finalizar
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        abierto={confirmar === 'finalizar'}
        titulo="Finalizar auditoría"
        textoConfirmar="Finalizar"
        procesando={trabajando === 'finalizar'}
        mensaje={
          resumen.sinPuntuar > 0 ? (
            <>Faltan {resumen.sinPuntuar} criterio(s) por puntuar. Puntúalos antes de finalizar.</>
          ) : (
            <>
              Se guardará con un cumplimiento de <strong>{porcentaje(resumen.cumplimiento)}</strong> y ya no podrá editarse (un admin puede
              reabrirla).
            </>
          )
        }
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (resumen.sinPuntuar > 0) return setConfirmar(null)
          const ok = await guardar(true)
          if (ok) setConfirmar(null)
        }}
      />
      <ConfirmModal
        abierto={confirmar === 'reabrir'}
        titulo="Reabrir auditoría"
        textoConfirmar="Reabrir"
        procesando={trabajando === 'reabrir'}
        mensaje="Vuelve a ser un borrador que se puede editar y finalizar de nuevo."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={() => accion('reabrir')}
      />
      <ConfirmModal
        abierto={confirmar === 'borrar'}
        titulo="Borrar auditoría"
        textoConfirmar="Borrar"
        procesando={trabajando === 'borrar'}
        mensaje="Se borra definitivamente, con sus puntajes y observaciones."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={() => accion('borrar')}
      />
    </div>
  )
}

/** Botones 0..max cuando el máximo es chico (se toca en el celular); campo numérico si no. */
function PuntajeInput({
  item,
  valor,
  editable,
  onChange,
}: {
  item: Criterio
  valor: number | null
  editable: boolean
  onChange: (p: number | null) => void
}) {
  const entero = Number.isInteger(item.max)
  if (entero && item.max <= 10) {
    return (
      <div className="mt-0.5 flex gap-1" role="group" aria-label="Puntaje">
        {Array.from({ length: item.max + 1 }, (_, n) => (
          <button
            key={n}
            type="button"
            disabled={!editable}
            aria-pressed={valor === n}
            onClick={() => onChange(valor === n ? null : n)}
            className={cn(
              'size-8 rounded-md border text-sm font-medium tabular-nums transition-colors disabled:cursor-default',
              valor === n
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-card text-foreground enabled:hover:bg-accent',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      max={item.max}
      step="any"
      className="mt-0.5 h-8 w-24 text-center"
      disabled={!editable}
      value={valor ?? ''}
      onChange={(e) => onChange(leerNumero(e.target.value, item.max))}
    />
  )
}
