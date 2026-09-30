// POST /api/create {title, name} — crea una KDD nueva; quien la crea es el organizador
import { readRequest, send, requireUser, newId, cleanName, cleanConfig, publicMember, safe } from "../lib/http.js";
import { saveConfig, saveMember } from "../lib/store.js";

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const u = requireUser(req, res);
  if (!u) return;
  const name = cleanName(body.name) || cleanName(u.name);
  if (!name) return send(res, 400, { error: "Escribe tu nombre." });

  const g = newId(15); // 20 caracteres: el enlace es la invitación, así que no se puede adivinar
  const config = { ...cleanConfig({ title: body.title }), createdAt: Date.now(), createdBy: u.uid };
  const m = { id: u.uid, name, picture: u.picture || null, days: [], added: null, admin: true, joinedAt: Date.now() };

  await saveConfig(g, config);
  await saveMember(g, m);
  send(res, 200, { group: g, config, member: publicMember(m) });
}
export default safe(handler);
