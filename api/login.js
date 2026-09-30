// POST /api/login {credential} — recibe el ID token del botón de Google y abre sesión
import { readRequest, send, safe } from "../lib/http.js";
import { verifyGoogleIdToken } from "../lib/google.js";
import { createSessionCookie, userIdFromSub } from "../lib/session.js";

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const p = await verifyGoogleIdToken(body.credential, process.env.GOOGLE_CLIENT_ID);
  if (!p) return send(res, 401, { error: "No se pudo verificar tu cuenta de Google. Inténtalo otra vez." });
  if (p.email && p.email_verified === false) return send(res, 403, { error: "Tu email de Google no está verificado." });

  const user = {
    uid: userIdFromSub(p.sub),
    name: String(p.given_name || p.name || "").slice(0, 40),
    fullName: String(p.name || "").slice(0, 80),
    email: p.email || null,
    picture: typeof p.picture === "string" && p.picture.startsWith("https://") ? p.picture : null,
  };
  res.setHeader("Set-Cookie", createSessionCookie(user, req));
  send(res, 200, { user: { uid: user.uid, name: user.name, picture: user.picture, email: user.email } });
}
export default safe(handler);
