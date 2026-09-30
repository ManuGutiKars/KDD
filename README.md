# Quedada KDD

Calendario de grupo para organizar KDD. Al entrar eliges:

- **Organizar una KDD:** creas el grupo, te conviertes en quien organiza y recibes un enlace para pasar al resto (con botón de copiar y de WhatsApp).
- **Unirme a una KDD:** pegas el enlace que te han pasado.

Cada persona pone su nombre y marca los días que puede. Cuando **todos** coinciden en un día, aparece la KDD con botones para añadirla a Google Calendar, Outlook o Apple Calendar (.ics).

Solo entra quien tiene el enlace: cada KDD tiene un identificador aleatorio de 20 caracteres imposible de adivinar. Las KDD se borran solas tras 180 días sin actividad.

## Publicarlo en Vercel

1. Sube esta carpeta a tu repositorio de GitHub e impórtalo en Vercel con *Application Preset* **Other**.
2. En el proyecto, **Storage → Upstash for Redis** (plan gratuito) y conéctalo al proyecto. Vercel añade solo `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. **Redeploy.**

No hace falta ninguna otra variable. (Si tenías `INVITE_CODE` y `ADMIN_CODE` de la versión anterior, puedes borrarlas.)

## Qué puede hacer quien organiza

- Ver y copiar el enlace de invitación en cualquier momento («Ver enlace de invitación»).
- Cambiar el nombre, la hora, la duración y el lugar de la KDD.
- Quitar a alguien del grupo.

## Cosas a tener en cuenta

- **Identidad por navegador.** Tu nombre y tu papel de organizador se guardan en el navegador donde creaste o te uniste a la KDD. En otro móvil o si borras los datos del navegador, entrarías como una persona nueva (y perderías el papel de organizador).
- **Cualquiera con la dirección de la web puede crear KDD nuevas**, pero no puede ver ni entrar en las de otros sin su enlace.
- **Añadir al calendario** requiere un clic por persona.
- **Probar en local:** `npx vercel dev`. Sin credenciales de Redis usa memoria y los datos se pierden al reiniciar.

## Estructura

```
public/index.html   la página (HTML + CSS + JS)
api/create.js       POST crear una KDD (quien la crea organiza)
api/state.js        GET  estado de una KDD
api/join.js         POST unirse con un nombre
api/me.js           POST cambiar tus días, nombre o «añadido al calendario»
api/admin.js        POST ajustes y quitar miembros (solo quien organiza)
lib/                acceso a Redis y utilidades
```
