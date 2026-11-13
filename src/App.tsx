import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AuditoriaDetalle from '@/pages/AuditoriaDetalle'
import Auditorias from '@/pages/Auditorias'
import Empresas from '@/pages/Empresas'
import Inicio from '@/pages/Inicio'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'
import PlantillaEditor from '@/pages/PlantillaEditor'
import Plantillas from '@/pages/Plantillas'
import Sucursales from '@/pages/Sucursales'
import Usuarios from '@/pages/Usuarios'

/**
 * Dos zonas: `/login` publica, y todo lo demas dentro de `AppLayout` (exige sesion).
 * Empresas, Sucursales, Plantillas y Usuarios son solo para admin (cada pagina lo comprueba).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="auditorias" element={<Auditorias />} />
        <Route path="auditorias/:id" element={<AuditoriaDetalle />} />
        <Route path="plantillas" element={<Plantillas />} />
        <Route path="plantillas/:id" element={<PlantillaEditor />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="sucursales" element={<Sucursales />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
