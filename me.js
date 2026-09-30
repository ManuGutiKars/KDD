// POST /api/me {name?, days?, added?} — cambia tus propios datos
import { guard, send, currentMember, cleanDays, cleanName, publicMember, safe } from "../lib/http.js";
import { getMembers, saveMember } from "../lib/store.js";

async function handler(req, res) {
  const body = await guard(req, res);
  if (!body) return;
  const m = await currentMember(req);
  if (!m) return send(res, 401, { error: "member" });

  if ("name" in body) {
    const name = cleanName(body.name);
    if (!name) return send(res, 400, { error: "Escribe tu nombre." });
    const others = await getMembers();
    if (others.some(o => o.id !== m.id && o.name.toLowerCase() === name.toLowerCase()))
      return send(res, 409, { error: "Ya hay alguien con ese nombre. Elige otro." });
    m.name = name;
  }
  if ("days" in body) m.days = cleanDays(body.days);
  if ("added" in body) m.added = cleanDays([body.added])[0] || null;

  await saveMember(m);
  send(res, 200, { member: publicMember(m) });
}
export default safe(handler);
