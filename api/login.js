// POST /api/login — recibe el ID token de Google y abre sesión.
//   · Modo ventana (web): JSON {credential} → responde JSON.
//   · Modo redirección (app instalada): Google envía un formulario {credential, g_csrf_token} → redirige a la app.
import { readRequest, send, safe } from "../lib/http.js";
import { verifyGoogleIdToken } from "../lib/google.js";
import { createSessionCookie, userIdFromSub } from "../lib/session.js";

function cookie(req, name) {
  const c = String(req.headers.cookie || "").split(/;\s*/).find(x => x.startsWith(name + "="));
  return c ? decodeURIComponent(c.slice(name.length + 1)) : null;
}
function redirect(res, to) { res.statusCode = 303; res.setHeader("Location", to); res.end(); }

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const isForm = String(req.headers["content-type"] || "").includes("application/x-www-form-urlencoded");

  if (isForm) {
    // Protección CSRF de Google: si el navegador envía la cookie, tiene que coincidir con el formulario.
    // (Algunos navegadores no la envían en un POST desde otro sitio; el token de Google se verifica igualmente.)
    const csrf = cookie(req, "g_csrf_token");
    if (csrf && csrf !== body.g_csrf_token) return redirect(res, "/?login=error");
  }

  const p = await verifyGoogleIdToken(body.credential, process.env.GOOGLE_CLIENT_ID);
  const fail = msg => isForm ? redirect(res, "/?login=error") : send(res, 401, { error: msg });
  if (!p) return fail("No se pudo verificar tu cuenta de Google. Inténtalo otra vez.");
  if (p.email && p.email_verified === false) return fail("Tu email de Google no está verificado.");

  const user = {
    uid: userIdFromSub(p.sub),
    name: String(p.given_name || p.name || "").slice(0, 40),
    email: p.email || null,
    picture: typeof p.picture === "string" && p.picture.startsWith("https://") ? p.picture : null,
  };
  res.setHeader("Set-Cookie", createSessionCookie(user, req));
  if (isForm) return redirect(res, "/?login=1");
  send(res, 200, { user: { uid: user.uid, name: user.name, picture: user.picture, email: user.email } });
}
export default safe(handler);
