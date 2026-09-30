import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getMember } from "./store.js";

export const hash = s => createHash("sha256").update(String(s)).digest("hex");
export const newId = () => randomBytes(9).toString("base64url");
export const newToken = () => randomBytes(24).toString("base64url");

function safeEqual(a, b) {
  const x = Buffer.from(hash(a || "")), y = Buffer.from(hash(b || ""));
  return timingSafeEqual(x, y);
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 50_000) break; }
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/** Comprueba el código de invitación. Devuelve el body parseado o null (y ya ha respondido). */
export async function guard(req, res, { method = "POST" } = {}) {
  if (req.method !== method) { send(res, 405, { error: "Método no permitido" }); return null; }
  const expected = process.env.INVITE_CODE;
  if (!expected) { send(res, 500, { error: "Falta configurar INVITE_CODE en Vercel." }); return null; }
  if (!safeEqual(req.headers["x-invite"], expected)) { send(res, 403, { error: "invite" }); return null; }
  return method === "GET" ? {} : await readBody(req);
}

export function isAdmin(req) {
  const expected = process.env.ADMIN_CODE;
  return !!expected && safeEqual(req.headers["x-admin"], expected);
}

/** Devuelve el miembro dueño del token, o null. */
export async function currentMember(req) {
  const id = String(req.headers["x-member"] || "");
  const tok = String(req.headers["x-token"] || "");
  if (!id || !tok) return null;
  const m = await getMember(id);
  if (!m || m.tokenHash !== hash(tok)) return null;
  return m;
}

export const publicMember = ({ tokenHash, ...m }) => m;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function cleanDays(days) {
  if (!Array.isArray(days)) return [];
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  return [...new Set(days.filter(d => typeof d === "string" && DAY.test(d) && d >= today))].sort().slice(0, 400);
}
export const cleanName = n => String(n || "").replace(/\s+/g, " ").trim().slice(0, 40);

/** Envuelve un handler para que un fallo (p. ej. Redis caído) devuelva un error legible. */
export const safe = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: "Error del servidor. Inténtalo en un momento." });
  }
};
