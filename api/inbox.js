// GET /api/inbox — últimos avisos del usuario (lo usa el service worker al recibir un push)
import { readRequest, send, requireUser, safe } from "../lib/http.js";
import { getInbox } from "../lib/store.js";

async function handler(req, res) {
  if (!(await readRequest(req, res, "GET"))) return;
  const u = requireUser(req, res);
  if (!u) return;
  send(res, 200, { items: await getInbox(u.uid) });
}
export default safe(handler);
