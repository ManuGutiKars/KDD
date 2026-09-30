// POST /api/me {g, name?, days?, added?} — cambia tus propios datos
import { readRequest, loadGroup, send, requireUser, memberOf, cleanDays, cleanName, publicMember, safe } from "../lib/http.js";
import { getMembers, saveMember } from "../lib/store.js";
import { checkMatch, originOf } from "../lib/notify.js";

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const u = requireUser(req, res);
  if (!u) return;
  const grp = await loadGroup(res, body.g);
  if (!grp) return;
  const m = await memberOf(grp.g, u.uid);
  if (!m) return send(res, 403, { error: "member" });

  if ("name" in body) {
    const name = cleanName(body.name);
    if (!name) return send(res, 400, { error: "Escribe tu nombre." });
    const others = await getMembers(grp.g);
    if (others.some(o => o.id !== m.id && o.name.toLowerCase() === name.toLowerCase()))
      return send(res, 409, { error: "Ya hay alguien con ese nombre. Elige otro." });
    m.name = name;
  }
  if ("days" in body) m.days = cleanDays(body.days);
  if ("added" in body) m.added = cleanDays([body.added])[0] || null;
  if (u.picture) m.picture = u.picture;

  await saveMember(grp.g, m);
  if ("days" in body) {
    try { await checkMatch(grp.g, grp.config, await getMembers(grp.g), originOf(req)); }
    catch (err) { console.error("[kdd] avisos", err); }
  }
  send(res, 200, { member: publicMember(m) });
}
export default safe(handler);
