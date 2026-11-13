import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Modal } from '@/components/ui/modal'

/** Marco común de los formularios de alta/edición: Borrar (solo al editar), Cancelar y Guardar. */
export function FormModal({
  abierto,
  titulo,
  editando,
  guardando,
  error,
  onCerrar,
  onGuardar,
  onBorrar,
  children,
}: {
  abierto: boolean
  titulo: string
  editando: boolean
  guardando: boolean
  error: string | null
  onCerrar: () => void
  onGuardar: () => void
  onBorrar?: () => void
  children: ReactNode
}) {
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      onCerrar={onCerrar}
      footer={
        <>
          {editando && onBorrar && (
            <Button variant="outline" onClick={onBorrar} disabled={guardando}>
              <Trash2 className="text-destructive" /> Borrar
            </Button>
          )}
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          onGuardar()
        }}
      >
        {children}
        {error && <ErrorBox mensaje={error} />}
      </form>
    </Modal>
  )
}
