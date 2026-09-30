// POST /api/join {g, name} — entra en una KDD con tu cuenta de Google
import { readRequest, loadGroup, send, requireUser, cleanName, publicMember, safe } from "../lib/http.js";
import { getMembers, saveMember } from "../lib/store.js";

const MAX_MEMBERS = 50;

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const u = requireUser(req, res);
  if (!u) return;
  const grp = await loadGroup(res, body.g);
  if (!grp) return;

  const members = await getMembers(grp.g);
  const existing = members.find(m => m.id === u.uid);
  if (existing) return send(res, 200, { member: publicMember(existing) });

  const name = cleanName(body.name) || cleanName(u.name);
  if (!name) return send(res, 400, { error: "Escribe tu nombre." });
  if (members.length >= MAX_MEMBERS) return send(res, 400, { error: "El grupo está lleno." });
  if (members.some(m => m.name.toLowerCase() === name.toLowerCase()))
    return send(res, 409, { error: "Ya hay alguien con ese nombre. Elige otro." });

  const m = { id: u.uid, name, picture: u.picture || null, days: [], added: null, admin: false, joinedAt: Date.now() };
  await saveMember(grp.g, m);
  send(res, 200, { member: publicMember(m) });
}
export default safe(handler);
