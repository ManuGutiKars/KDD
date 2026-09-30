// GET  /api/push                       — clave pública VAPID para suscribirse
// POST /api/push {subscription}        — guarda la suscripción de este dispositivo
// POST /api/push {unsubscribe: endpoint} — la borra
import { readRequest, send, requireUser, safe } from "../lib/http.js";
import { saveSub, removeSub } from "../lib/store.js";
import { getVapid } from "../lib/push.js";

async function handler(req, res) {
  if (req.method === "GET") {
    const { publicKey } = await getVapid();
    return send(res, 200, { publicKey });
  }
  const body = await readRequest(req, res);
  if (!body) return;
  const u = requireUser(req, res);
  if (!u) return;
  if (body.unsubscribe) { await removeSub(u.uid, String(body.unsubscribe)); return send(res, 200, { ok: true }); }
  const s = body.subscription;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth)
    return send(res, 400, { error: "Suscripción no válida." });
  await saveSub(u.uid, { endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) } });
  send(res, 200, { ok: true });
}
export default safe(handler);
