// POST /api/create {title, name} — crea una KDD nueva; quien la crea es el organizador
import { readRequest, send, newId, newToken, hash, cleanName, cleanConfig, publicMember, safe } from "../lib/http.js";
import { saveConfig, saveMember } from "../lib/store.js";

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const name = cleanName(body.name);
  if (!name) return send(res, 400, { error: "Escribe tu nombre." });

  const g = newId(15); // 20 caracteres: el enlace es la invitación, así que no se puede adivinar
  const config = { ...cleanConfig({ title: body.title }), createdAt: Date.now() };
  const token = newToken();
  const m = { id: newId(), name, days: [], added: null, admin: true, joinedAt: Date.now(), tokenHash: hash(token) };

  await saveConfig(g, config);
  await saveMember(g, m);
  send(res, 200, { group: g, config, member: publicMember(m), token });
}
export default safe(handler);
