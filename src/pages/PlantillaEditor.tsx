import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresas, usePlantillas } from '@/hooks/useCatalogo'
import { idNuevo, mover } from '@/lib/listas'
import type { PlantillaImportada } from '@/lib/importarExcel'
import { numero } from '@/lib/puntaje'
import type { Seccion } from '@/lib/tipos'

const seccionNueva = (max: number): Seccion => ({ id: idNuevo(), titulo: '', items: [{ id: idNuevo(), texto: '', max }] })

/** Alta y edición de una plantilla: datos del formato, secciones y criterios (orden, texto y puntaje máximo). */
export default function PlantillaEditor() {
  const { esAdmin } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const importada = (useLocation().state as { importada?: PlantillaImportada } | null)?.importada
  const esNueva = id === 'nueva'

  const { data: plantillas, loading, error, crear, editar, eliminar } = usePlantillas()
  const { data: empresas } = useEmpresas()
  const plantilla = useMemo(() => plantillas.find((p) => p.id === id), [plantillas, id])

  const [empresaId, setEmpresaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('INFORME DE AUDITORÍA INTERNA')
  const [escalaMax, setEscalaMax] = useState(5)
  const [activo, setActivo] = useState(true)
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [cargado, setCargado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  useEffect(() => {
    if (!esAdmin) navigate('/', { replace: true })
  }, [esAdmin, navigate])

  // Se llena el formulario una sola vez: las actualizaciones de fondo de la tabla no deben pisar lo que se está escribiendo.
  useEffect(() => {
    if (cargado) return
    if (esNueva) {
      if (importada) {
        setTitulo(importada.titulo || 'INFORME DE AUDITORÍA INTERNA')
        setCodigo(importada.codigo)
        setSecciones(importada.secciones)
      } else setSecciones([seccionNueva(5)])
      setCargado(true)
    } else if (plantilla) {
      setEmpresaId(plantilla.empresaId)
      setNombre(plantilla.nombre)
      setCodigo(plantilla.codigo)
      setTitulo(plantilla.titulo)
      setEscalaMax(plantilla.escalaMax)
      setActivo(plantilla.activo)
      setSecciones(plantilla.secciones.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it })) })))
      setCargado(true)
    }
  }, [cargado, esNueva, plantilla, importada])

  useEffect(() => {
    if (esNueva && !empresaId && empresas.length === 1) setEmpresaId(empresas[0].id)
  }, [esNueva, empresaId, empresas])

  if (!esAdmin) return null
  if (loading && !cargado) return <Cargando />
  if (error && !cargado) return <ErrorBox mensaje={error} />
  if (!esNueva && !plantilla && !cargado) {
    return (
      <div>
        <ErrorBox mensaje="La plantilla no existe." />
        <Link to="/plantillas" className="mt-3 inline-block text-sm text-primary underline">
          Volver a plantillas
        </Link>
      </div>
    )
  }

  const totalCriterios = secciones.reduce((n, s) => n + s.items.length, 0)
  const totalPuntos = secciones.reduce((n, s) => n + s.items.reduce((m, it) => m + (it.max || 0), 0), 0)

  const cambiarSeccion = (i: number, parche: Partial<Seccion>) =>
    setSecciones((l) => l.map((s, k) => (k === i ? { ...s, ...parche } : s)))
  const cambiarItem = (i: number, j: number, parche: Partial<Seccion['items'][number]>) =>
    setSecciones((l) =>
      l.map((s, k) => (k === i ? { ...s, items: s.items.map((it, m) => (m === j ? { ...it, ...parche } : it)) } : s)),
    )

  async function onGuardar() {
    if (!empresaId) return setErrorForm('Elige la empresa.')
    if (!nombre.trim()) return setErrorForm('El nombre de la plantilla es obligatorio.')
    if (secciones.some((s) => !s.titulo.trim())) return setErrorForm('Todas las secciones necesitan un título.')
    if (secciones.some((s) => s.items.some((it) => !it.texto.trim()))) return setErrorForm('Todos los criterios necesitan un texto.')
    if (secciones.some((s) => s.items.some((it) => !(it.max > 0)))) return setErrorForm('El puntaje máximo de cada criterio debe ser mayor que 0.')
    if (totalCriterios === 0) return setErrorForm('Agrega al menos un criterio.')

    setGuardando(true)
    setErrorForm(null)
    const datos = { empresaId, nombre: nombre.trim(), codigo: codigo.trim(), titulo: titulo.trim(), escalaMax, activo, secciones }
    if (esNueva) {
      const { error: err, data: r } = await crear(datos)
      setGuardando(false)
      if (err || !r) return setErrorForm(err ?? 'No se pudo crear la plantilla.')
      toast.success('Plantilla creada.')
      navigate(`/plantillas/${r.id}`, { replace: true })
    } else {
      const { error: err } = await editar(id!, datos)
      setGuardando(false)
      if (err) return setErrorForm(err)
      toast.success('Plantilla guardada.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/plantillas" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Plantillas
          </Link>
          <h1 className="text-lg font-semibold text-foreground">{esNueva ? 'Nueva plantilla' : 'Editar plantilla'}</h1>
        </div>
        {!esNueva && (
          <Button variant="outline" onClick={() => setConfirmarBorrar(true)} disabled={guardando}>
            <Trash2 className="text-destructive" /> Borrar
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <Field label="Empresa *">
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Elegir empresa…</option>
            {empresas
              .filter((e) => e.activo || e.id === empresaId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Nombre de la plantilla *" hint="Para elegirla al crear una auditoría.">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Título del informe" hint="Sale en la cabecera del PDF.">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} />
        </Field>
        <Field label="Código del formato" hint="Ej.: AI-PL-07. Sale debajo del título.">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={30} />
        </Field>
        <Field label="Puntaje máximo por defecto" hint="Se propone en los criterios nuevos; cada criterio puede tener el suyo.">
          <Input
            type="number"
            min={1}
            max={1000}
            value={escalaMax}
            onChange={(e) => setEscalaMax(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
        <Field label="Estado" hint="Una plantilla inactiva no se puede elegir para auditorías nuevas.">
          <Select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')}>
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </Select>
        </Field>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Los cambios no afectan a auditorías ya creadas: cada una guarda su propia copia de los criterios.
      </p>

      <div className="space-y-4">
        {secciones.map((s, i) => (
          <section key={s.id} className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <Badge tono="primary">{i + 1}</Badge>
              <Input
                aria-label={`Título de la sección ${i + 1}`}
                className="min-w-0 flex-1 font-medium"
                placeholder="Título de la sección (ej.: CUMPLIMIENTO DE PROCEDIMIENTO DE CAJA)"
                value={s.titulo}
                maxLength={200}
                onChange={(e) => cambiarSeccion(i, { titulo: e.target.value })}
              />
              <Button variant="ghost" size="icon" title="Subir sección" disabled={i === 0} onClick={() => setSecciones((l) => mover(l, i, -1))}>
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Bajar sección"
                disabled={i === secciones.length - 1}
                onClick={() => setSecciones((l) => mover(l, i, 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Quitar sección"
                onClick={() => {
                  if (s.items.length > 0 && !window.confirm(`¿Quitar la sección con sus ${s.items.length} criterios?`)) return
                  setSecciones((l) => l.filter((_, k) => k !== i))
                }}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>

            <div className="divide-y divide-border">
              {s.items.map((it, j) => (
                <div key={it.id} className="flex flex-wrap items-start gap-2 p-3">
                  <span className="mt-2 w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{j + 1}</span>
                  <Textarea
                    aria-label={`Criterio ${j + 1} de la sección ${i + 1}`}
                    className="min-h-14 min-w-0 flex-1 basis-64"
                    placeholder="Criterio de evaluación"
                    value={it.texto}
                    maxLength={600}
                    onChange={(e) => cambiarItem(i, j, { texto: e.target.value })}
                  />
                  <label className="flex flex-col text-[11px] text-muted-foreground">
                    Máx.
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      className="w-20"
                      value={it.max}
                      onChange={(e) => cambiarItem(i, j, { max: Number(e.target.value) })}
                    />
                  </label>
                  <div className="mt-4 flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Subir criterio"
                      disabled={j === 0}
                      onClick={() => cambiarSeccion(i, { items: mover(s.items, j, -1) })}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Bajar criterio"
                      disabled={j === s.items.length - 1}
                      onClick={() => cambiarSeccion(i, { items: mover(s.items, j, 1) })}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Quitar criterio"
                      onClick={() => cambiarSeccion(i, { items: s.items.filter((_, m) => m !== j) })}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="p-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => cambiarSeccion(i, { items: [...s.items, { id: idNuevo(), texto: '', max: escalaMax }] })}
                >
                  <Plus /> Agregar criterio
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <Button variant="outline" className="mt-4" onClick={() => setSecciones((l) => [...l, seccionNueva(escalaMax)])}>
        <Plus /> Agregar sección
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {secciones.length} secciones · {totalCriterios} criterios · puntaje máximo {numero(totalPuntos)}
          </p>
          <div className="flex items-center gap-3">
            {errorForm && <span className="text-sm text-destructive">{errorForm}</span>}
            <Button onClick={onGuardar} disabled={guardando}>
              <Save /> {guardando ? 'Guardando…' : 'Guardar plantilla'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        abierto={confirmarBorrar}
        titulo="Borrar plantilla"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={
          <>
            ¿Borrar <strong>{nombre}</strong>? Las auditorías ya hechas conservan sus criterios.
          </>
        }
        onCancelar={() => setConfirmarBorrar(false)}
        onConfirmar={async () => {
          setBorrando(true)
          const { error: err } = await eliminar(id!)
          setBorrando(false)
          setConfirmarBorrar(false)
          if (err) return toast.error(err)
          toast.success('Plantilla borrada.')
          navigate('/plantillas', { replace: true })
        }}
      />
    </div>
  )
}
