// GET /api/mine — tus KDD (en cualquier dispositivo)
import { readRequest, send, requireUser, safe } from "../lib/http.js";
import { getUserGroups } from "../lib/store.js";

async function handler(req, res) {
  if (!(await readRequest(req, res, "GET"))) return;
  const u = requireUser(req, res);
  if (!u) return;
  send(res, 200, { groups: await getUserGroups(u.uid) });
}
export default safe(handler);
