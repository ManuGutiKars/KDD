// GET /api/state?g=<grupo> — estado de la KDD (miembros, días, ajustes)
import { readRequest, loadGroup, send, currentMember, publicMember, safe } from "../lib/http.js";
import { getMembers } from "../lib/store.js";

async function handler(req, res) {
  const q = await readRequest(req, res, "GET");
  if (!q) return;
  const grp = await loadGroup(res, q.g);
  if (!grp) return;
  const [members, me] = await Promise.all([getMembers(grp.g), currentMember(req, grp.g)]);
  send(res, 200, {
    config: grp.config,
    members: members.map(publicMember).sort((a, b) => a.joinedAt - b.joinedAt),
    me: me ? me.id : null,
    admin: !!me?.admin,
  });
}
export default safe(handler);
