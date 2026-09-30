// POST /api/admin {g, config?} | {g, remove: uid} — solo el organizador de esa KDD
import { readRequest, loadGroup, send, requireUser, memberOf, cleanConfig, safe } from "../lib/http.js";
import { saveConfig, deleteMember, getMembers } from "../lib/store.js";
import { checkMatch, originOf } from "../lib/notify.js";

async function handler(req, res) {
  const body = await readRequest(req, res);
  if (!body) return;
  const u = requireUser(req, res);
  if (!u) return;
  const grp = await loadGroup(res, body.g);
  if (!grp) return;
  const me = await memberOf(grp.g, u.uid);
  if (!me?.admin) return send(res, 403, { error: "Solo quien organiza puede hacer esto." });

  if (body.config) {
    const config = cleanConfig(body.config, grp.config);
    await saveConfig(grp.g, config);
    return send(res, 200, { config });
  }
  if (body.remove) {
    if (String(body.remove) === me.id) return send(res, 400, { error: "No puedes quitarte a ti mismo." });
    await deleteMember(grp.g, String(body.remove));
    try { await checkMatch(grp.g, grp.config, await getMembers(grp.g), originOf(req)); }
    catch (err) { console.error("[kdd] avisos", err); }
    return send(res, 200, { ok: true });
  }
  send(res, 400, { error: "Nada que hacer." });
}
export default safe(handler);
