// GET /api/state?g=<grupo> — estado de la KDD. Sin sesión solo se ve el nombre de la KDD.
import { readRequest, loadGroup, send, publicMember, safe } from "../lib/http.js";
import { readSession } from "../lib/session.js";
import { getMembers } from "../lib/store.js";

async function handler(req, res) {
  const q = await readRequest(req, res, "GET");
  if (!q) return;
  const grp = await loadGroup(res, q.g);
  if (!grp) return;
  const u = readSession(req);
  if (!u) return send(res, 200, { config: { title: grp.config.title }, login: false });

  const members = await getMembers(grp.g);
  const me = members.find(m => m.id === u.uid);
  send(res, 200, {
    login: true,
    config: grp.config,
    // Hasta que no te unes solo ves cuántos sois, no quiénes ni sus días
    members: me ? members.map(publicMember).sort((a, b) => a.joinedAt - b.joinedAt) : [],
    count: members.length,
    me: me ? me.id : null,
    admin: !!me?.admin,
  });
}
export default safe(handler);
