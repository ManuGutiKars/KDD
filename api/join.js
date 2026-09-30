// POST /api/join {g, name} — entra en una KDD con tu cuenta de Google
import { readRequest, loadGroup, send, requireUser, cleanName, publicMember, safe } from "../lib/http.js";
import { getMembers, saveMember } from "../lib/store.js";
import { checkMatch, notifyUsers, originOf } from "../lib/notify.js";

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
  try {
    const admins = members.filter(x => x.admin).map(x => x.id);
    await notifyUsers(admins, {
      title: `${name} se ha unido`,
      body: `Ya sois ${members.length + 1} en «${grp.config.title || "KDD"}».`,
      url: `/?kdd=${grp.g}`,
      tag: `join-${grp.g}`,
    }, originOf(req));
    await checkMatch(grp.g, grp.config, [...members, m], originOf(req)); // alguien nuevo puede deshacer la coincidencia
  } catch (err) { console.error("[kdd] avisos", err); }
  send(res, 200, { member: publicMember(m) });
}
export default safe(handler);
