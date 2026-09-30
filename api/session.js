// GET /api/session — ¿quién soy? + client id de Google para pintar el botón
import { readRequest, send, safe } from "../lib/http.js";
import { readSession } from "../lib/session.js";

async function handler(req, res) {
  if (!(await readRequest(req, res, "GET"))) return;
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  if (!clientId) return send(res, 500, { error: "Falta GOOGLE_CLIENT_ID en las variables de entorno de Vercel." });
  const s = readSession(req);
  send(res, 200, { clientId, user: s ? { uid: s.uid, name: s.name, picture: s.picture, email: s.email } : null });
}
export default safe(handler);
