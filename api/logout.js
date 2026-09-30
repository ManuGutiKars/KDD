// POST /api/logout — cierra sesión
import { readRequest, send, safe } from "../lib/http.js";
import { clearSessionCookie } from "../lib/session.js";

async function handler(req, res) {
  if (!(await readRequest(req, res))) return;
  res.setHeader("Set-Cookie", clearSessionCookie(req));
  send(res, 200, { ok: true });
}
export default safe(handler);
