// GET /api/state — estado del grupo (miembros, días, ajustes)
import { guard, send, isAdmin, currentMember, publicMember, safe } from "../lib/http.js";
import { getMembers, getConfig } from "../lib/store.js";

async function handler(req, res) {
  if (!(await guard(req, res, { method: "GET" }))) return;
  const [members, config, me] = await Promise.all([getMembers(), getConfig(), currentMember(req)]);
  send(res, 200, {
    members: members.map(publicMember).sort((a, b) => a.joinedAt - b.joinedAt),
    config,
    me: me ? me.id : null,
    admin: isAdmin(req),
  });
}
export default safe(handler);
