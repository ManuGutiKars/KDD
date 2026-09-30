// Sesión en una cookie firmada (HttpOnly, 30 días). Contiene quién eres según Google.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const COOKIE = "kdd_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("Falta SESSION_SECRET (mínimo 16 caracteres) en las variables de entorno.");
  return s;
}
const sign = data => createHmac("sha256", secret()).update(data).digest("base64url");

/** Id estable y opaco del usuario a partir del "sub" de Google. */
export const userIdFromSub = sub => createHash("sha256").update("google:" + sub).digest("base64url").slice(0, 22);

export function createSessionCookie(user, req) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  return cookieString(value, MAX_AGE, req);
}

export function clearSessionCookie(req) {
  return cookieString("", 0, req);
}

function cookieString(value, maxAge, req) {
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** Devuelve {uid, name, email, picture} o null. */
export function readSession(req) {
  const raw = String(req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload)), given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!s.uid || s.exp < Date.now() / 1000) return null;
    return s;
  } catch { return null; }
}
