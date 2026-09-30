import { createHash, randomBytes } from "node:crypto";
import { getConfig, getMember } from "./store.js";

export const hash = s => createHash("sha256").update(String(s)).digest("hex");
export const newId = (bytes = 9) => randomBytes(bytes).toString("base64url");
export const newToken = () => randomBytes(24).toString("base64url");

const GROUP_ID = /^[A-Za-z0-9_-]{16,32}$/;

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

/** Comprueba método y lee el body. Devuelve el body o null (y ya ha respondido). */
export async function readRequest(req, res, method = "POST") {
  if (req.method !== method) { send(res, 405, { error: "Método no permitido" }); return null; }
  if (method === "GET") return Object.fromEntries(new URL(req.url, "http://x").searchParams);
  return await readBody(req);
}

/** Carga el grupo indicado en `g`. Devuelve {g, config} o null (y ya ha respondido). */
export async function loadGroup(res, g) {
  g = String(g || "");
  const config = GROUP_ID.test(g) ? await getConfig(g) : null;
  if (!config) { send(res, 404, { error: "group" }); return null; }
  return { g, config };
}

/** Devuelve el miembro dueño del token en ese grupo, o null. */
export async function currentMember(req, g) {
  const id = String(req.headers["x-member"] || "");
  const tok = String(req.headers["x-token"] || "");
  if (!id || !tok) return null;
  const m = await getMember(g, id);
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

export function cleanConfig(c = {}, prev = {}) {
  return {
    ...prev,
    title: String(c.title ?? prev.title ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "KDD",
    time: /^\d{2}:\d{2}$/.test(c.time) ? c.time : (prev.time || "20:00"),
    hours: Math.min(24, Math.max(0.5, Number(c.hours ?? prev.hours) || 3)),
    place: String(c.place ?? prev.place ?? "").trim().slice(0, 120),
  };
}

/** Envuelve un handler para que un fallo (p. ej. Redis caído) devuelva un error legible. */
export const safe = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: "Error del servidor. Inténtalo en un momento." });
  }
};
