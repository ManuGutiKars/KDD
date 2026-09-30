# Quedada KDD

Calendario de grupo para organizar KDD. Cada persona entra con su **cuenta de Google** y elige:

- **Organizar una KDD:** crea el grupo, se convierte en quien organiza y recibe un enlace para pasar al resto (copiar o enviar por WhatsApp).
- **Unirme a una KDD:** pega el enlace que le han pasado (o lo abre directamente).

Cada uno marca los días que puede. Cuando **todos** coinciden en un día, aparece la KDD con botones para añadirla a Google Calendar, Outlook o Apple Calendar (.ics).

- Tu identidad va con tu cuenta de Google: puedes entrar desde el móvil o el ordenador y sigues siendo tú (y sigues siendo organizador).
- Solo entra quien tiene el enlace. Quien no se ha unido no ve quién está ni qué días marcó.
- Las KDD se borran solas tras 180 días sin actividad.

## 1. Crear el acceso con Google (Google Cloud, gratis)

1. Entra en <https://console.cloud.google.com/> con tu cuenta de Google y crea un proyecto nuevo (por ejemplo «Quedada KDD»).
2. Ve a **APIs y servicios → Google Auth Platform** (o «Pantalla de consentimiento de OAuth»):
   - **Branding / Información de la app:** nombre «Quedada KDD», tu email de asistencia y tu email de contacto.
   - **Público / Audience:** tipo **Externo**. Después pulsa **Publicar app** (pasar a «En producción»). Si la dejas en «Prueba», solo podrán entrar las cuentas que añadas como usuarios de prueba. Como solo pedimos nombre, email y foto, Google no exige verificación.
3. Ve a **Clientes → Crear cliente** (o «Credenciales → Crear credenciales → ID de cliente de OAuth»):
   - Tipo: **Aplicación web**.
   - **Orígenes de JavaScript autorizados:** añade tu dirección de Vercel, p. ej. `https://kdd-xxx.vercel.app` (sin barra al final). Si usas un dominio propio, añádelo también.
   - No hace falta rellenar «URIs de redireccionamiento».
4. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

## 2. Variables en Vercel

En el proyecto de Vercel, **Settings → Environment Variables** (Production and Preview):

| Variable | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | el ID de cliente del paso anterior |
| `SESSION_SECRET` | una cadena larga aleatoria (32+ caracteres). Si la cambias, todos tendrán que volver a entrar |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | las pone Vercel al conectar **Storage → Upstash for Redis** |

Puedes borrar `INVITE_CODE` y `ADMIN_CODE` si siguen ahí de versiones anteriores.

Después: sube los archivos al repositorio (Vercel despliega solo) o haz **Redeploy**.

## Qué puede hacer quien organiza

- Ver y copiar el enlace de invitación en cualquier momento («Ver enlace de invitación»).
- Cambiar el nombre, la hora, la duración y el lugar de la KDD.
- Quitar a alguien del grupo.

## Problemas típicos

- **El botón de Google no aparece o dice «origin not allowed»:** la dirección exacta de tu web no está en «Orígenes de JavaScript autorizados». Los cambios pueden tardar unos minutos en aplicarse.
- **«Acceso bloqueado: esta app no ha completado la verificación» / solo entran algunos:** la app sigue en modo «Prueba». Publícala (paso 1.2).
- **Error del servidor al entrar:** revisa que `SESSION_SECRET` y `GOOGLE_CLIENT_ID` están puestos y que has redesplegado.

## Estructura

```
public/index.html   la página (HTML + CSS + JS)
api/session.js      GET  quién soy + client id de Google
api/login.js        POST verifica el token de Google y abre sesión (cookie)
api/logout.js       POST cierra sesión
api/mine.js         GET  tus KDD
api/create.js       POST crear una KDD (quien la crea organiza)
api/state.js        GET  estado de una KDD
api/join.js         POST unirse
api/me.js           POST cambiar tus días, nombre o «añadido al calendario»
api/admin.js        POST ajustes y quitar miembros (solo quien organiza)
lib/                Redis, sesión, verificación de Google y utilidades
```
