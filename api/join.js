// POST /api/join {g, name} — entra en una KDD; devuelve id + token (se guarda en el navegador)
import { readRequest, loadGroup, send, newId, newToken, hash, cleanName, publicMember, safe } from "../lib/http.js";
import { getMembers, saveMember } from "../lib/store.js";

const MAX_MEMBERS = 50;

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const grp = await loadGroup(res, body.g);
  if (!grp) return;
  const name = cleanName(body.name);
  if (!name) return send(res, 400, { error: "Escribe tu nombre." });
  const members = await getMembers(grp.g);
  if (members.length >= MAX_MEMBERS) return send(res, 400, { error: "El grupo está lleno." });
  if (members.some(m => m.name.toLowerCase() === name.toLowerCase()))
    return send(res, 409, { error: "Ya hay alguien con ese nombre. Elige otro." });
  const token = newToken();
  const m = { id: newId(), name, days: [], added: null, admin: false, joinedAt: Date.now(), tokenHash: hash(token) };
  await saveMember(grp.g, m);
  send(res, 200, { member: publicMember(m), token });
}
export default safe(handler);
