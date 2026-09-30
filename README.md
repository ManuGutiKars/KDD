# Quedada KDD

Calendario de grupo: cada persona entra con el enlace de invitación, se pone un nombre y marca los días que puede ir. Cuando **todos** coinciden en un día, aparece la KDD con botones para añadirla a Google Calendar, Outlook o Apple Calendar (.ics).

- Sin dependencias ni compilación: una página estática (`public/index.html`) y 4 funciones en `api/`.
- Los datos se guardan en **Upstash Redis** (gratis desde el Marketplace de Vercel).
- Solo entra quien tiene el enlace con el código de invitación.

## Publicarlo en Vercel (unos 10 minutos)

1. **Sube el proyecto a GitHub.** Crea un repositorio y sube esta carpeta (o usa `vercel` desde la terminal: `npm i -g vercel` y luego `vercel` dentro de la carpeta).
2. **Importa el repositorio en Vercel:** *Add New… → Project*, elige el repo. En *Framework Preset* deja **Other** y pulsa *Deploy*.
3. **Crea la base de datos:** en el proyecto, pestaña **Storage → Create Database → Upstash for Redis** (plan gratuito) y conéctala al proyecto. Vercel añade solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
4. **Añade tus códigos:** *Settings → Environment Variables*:
   - `INVITE_CODE`: el código de invitación (algo largo y difícil de adivinar, p. ej. `kdd-lagarto-7392-azul`).
   - `ADMIN_CODE`: tu código de organizador, distinto del anterior.
5. **Vuelve a desplegar** (*Deployments → ⋯ → Redeploy*) para que coja las variables.

## Uso

- **Tú (organizador)** abres una vez:
  `https://TU-PROYECTO.vercel.app/?invite=INVITE_CODE&admin=ADMIN_CODE`
  Verás «Ajustes de la quedada» (nombre, hora, duración, lugar), el botón para copiar el enlace de invitación y la opción de quitar miembros.
- **Tus amigos** abren: `https://TU-PROYECTO.vercel.app/?invite=INVITE_CODE`
  Escriben su nombre y marcan días. Los códigos se guardan en su navegador y desaparecen de la barra de direcciones.
- La página se actualiza sola cada 5 segundos.

## Cosas a tener en cuenta

- **Identidad por navegador.** Al entrar, cada persona recibe una clave guardada en su navegador. Si cambia de móvil o borra los datos del navegador, tendrá que volver a entrar con otro nombre (el organizador puede quitar el antiguo).
- **Si el enlace se filtra**, cambia `INVITE_CODE` en Vercel, redespliega y pasa el enlace nuevo. Los miembros ya dentro también necesitarán el enlace nuevo.
- **Añadir al calendario** requiere un clic por persona. Para crear la cita de forma automática habría que añadir login con Google y permisos de Google Calendar.
- **Probarlo en local:** `npx vercel dev` con un archivo `.env` (mira `.env.example`). Sin credenciales de Redis usa memoria y los datos se pierden al reiniciar.

## Estructura

```
public/index.html   la página (HTML + CSS + JS)
api/state.js        GET  estado del grupo
api/join.js         POST entrar con un nombre
api/me.js           POST cambiar tus días, nombre o «añadido al calendario»
api/admin.js        POST ajustes y quitar miembros (requiere ADMIN_CODE)
lib/                acceso a Redis y utilidades
```
