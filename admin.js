// POST /api/admin {config?} | {remove: id} — solo con el código de organizador
import { guard, send, isAdmin, safe } from "../lib/http.js";
import { saveConfig, deleteMember } from "../lib/store.js";

async function handler(req, res) {
  const body = await guard(req, res);
  if (!body) return;
  if (!isAdmin(req)) return send(res, 403, { error: "Solo quien organiza puede hacer esto." });

  if (body.config) {
    const c = body.config;
    const config = {
      title: String(c.title || "").trim().slice(0, 60),
      time: /^\d{2}:\d{2}$/.test(c.time) ? c.time : "20:00",
      hours: Math.min(24, Math.max(0.5, Number(c.hours) || 3)),
      place: String(c.place || "").trim().slice(0, 120),
    };
    await saveConfig(config);
    return send(res, 200, { config });
  }
  if (body.remove) {
    await deleteMember(String(body.remove));
    return send(res, 200, { ok: true });
  }
  send(res, 400, { error: "Nada que hacer." });
}
export default safe(handler);
