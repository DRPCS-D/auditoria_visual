# Auditoría Visual

Auditorías y control de tiendas. Cada empresa tiene sus **plantillas** de criterios (editables: secciones, criterios, puntaje máximo, orden), sus sucursales y sus auditorías. Al terminar una auditoría se descarga el **informe en PDF** con el mismo formato del Excel original.

Frontend: React 19 + Vite + Tailwind 4 (Vercel). Backend: Google Apps Script sobre Google Sheets. Base: [gestor-tareas](../gestor-tareas) (login, caché con revisiones, UI).

## Cómo funciona

- **Empresa → Sucursales y Plantillas.** Una plantilla (admin) lleva título del informe, código del formato (ej. AI-PL-07), secciones y criterios, cada uno con su puntaje máximo. Se puede duplicar.
- **Auditoría**: se elige empresa, plantilla, sucursal, fecha y auditor. Se guarda como *borrador* y se puntúa criterio por criterio (con hallazgo opcional); al *finalizar* queda de solo lectura (el admin puede reabrirla).
- **Copia de la plantilla**: cada auditoría guarda su propia copia de los criterios; editar o borrar la plantilla no cambia auditorías hechas.
- **Anterior**: se rellena sola con los puntajes de la última auditoría finalizada de esa sucursal con la misma plantilla (editable).
- **Tendencia**: MEJORA / BAJA según el puntaje anterior; si no cambió, EXCELENTE (máximo) o IGUAL.
- **PDF**: hoja A4 horizontal con cabecera, datos de la tienda, resultado y tabla por sección con totales y cumplimiento.

## Roles

| Rol | Puede |
|---|---|
| `admin` | Todo: empresas, sucursales, plantillas, usuarios, reabrir cualquier auditoría y borrar borradores (una auditoría finalizada no se borra). |
| `auditor` | Crear, completar y reabrir sus propias auditorías (solo ve las que él creó), y crear y editar empresas, sucursales y plantillas (no borrar). |
| `consulta` | Ver auditorías y descargar el PDF. |

Un usuario sin empresas marcadas accede a todas.

## Google Sheet y Apps Script

1. Crea una hoja de cálculo vacía → Extensiones → Apps Script. Pega `apps-script/Code.gs` y, en la configuración del proyecto, activa «Mostrar el archivo appsscript.json» y pega `apps-script/appsscript.json`.
2. Ejecuta la función `instalar` (acepta permisos). Crea las pestañas `Usuarios`, `Empresas`, `Sucursales`, `Plantillas`, `Auditorias`, una empresa/sucursal/plantilla de ejemplo (la del Excel de noviembre 2026) y un usuario `ADMIN` con contraseña aleatoria (visible en `Usuarios`). Es seguro repetirla.
3. Implementar → Aplicación web → Ejecutar como: **Yo** · Acceso: **Cualquier usuario**. Copia la URL `/exec`.
4. Tras actualizar `Code.gs`, publica una **nueva versión** de la implementación.

No edites a mano `Auditorias` ni `Plantillas` (guardan JSON); el resto de pestañas sí, y luego pulsa ↻ en la app.

## Frontend

```bash
cp .env.example .env     # pega la URL /exec en VITE_APPS_SCRIPT_URL
npm install
npm run dev              # http://localhost:5179
npm test
npm run build
```

En Vercel define `VITE_APPS_SCRIPT_URL` y despliega el repositorio.

## Seguridad

Heredado del proyecto base: las contraseñas se guardan en texto plano en la hoja y viajan en cada llamada. Aceptable para uso interno de baja criticidad; no reutilices contraseñas personales.
