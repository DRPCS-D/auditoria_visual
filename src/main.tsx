import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './hooks/useAuth'
import { registerServiceWorker } from './lib/registerServiceWorker'
import { aplicarTema } from './lib/tema'
import './index.css'

// index.html ya aplico el tema antes del primer pintado; esto solo lo
// reafirma una vez que el modulo esta cargado, para que el estado del
// documento y el del modulo arranquen sincronizados.
aplicarTema()

// dist/sw.js solo existe en el build de produccion (lo genera el plugin
// de vite.config.ts); en `npm run dev` no hay nada que registrar.
if (import.meta.env.PROD) registerServiceWorker()

// Router con datos (en vez de <BrowserRouter>): hace falta para poder avisar al salir de una pantalla con cambios sin guardar.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <App />
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
