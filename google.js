// Verifica el ID token que devuelve el botón "Iniciar sesión con Google", sin dependencias.
import { createPublicKey, createVerify } from "node:crypto";

const CERTS_URL = process.env.GOOGLE_CERTS_URL || "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
let cache = { keys: null, until: 0 };

async function getKeys(force = false) {
  if (!force && cache.keys && Date.now() < cache.until) return cache.keys;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error("No se pudieron leer las claves de Google");
  const { keys } = await r.json();
  const maxAge = Number((r.headers.get("cache-control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  cache = { keys, until: Date.now() + maxAge * 1000 };
  return keys;
}

const b64json = s => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

/** Devuelve el payload del token si es válido para este client_id; si no, null. */
export async function verifyGoogleIdToken(idToken, clientId) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3 || !clientId) return null;
  let header, payload;
  try { header = b64json(parts[0]); payload = b64json(parts[1]); } catch { return null; }
  if (header.alg !== "RS256" || !header.kid) return null;

  let jwk = (await getKeys()).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(true)).find(k => k.kid === header.kid); // Google rota sus claves
  if (!jwk) return null;

  const ok = createVerify("RSA-SHA256")
    .update(`${parts[0]}.${parts[1]}`)
    .verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.has(payload.iss)) return null;
  if (payload.aud !== clientId) return null;
  if (!payload.exp || payload.exp < now - 60) return null;
  if (!payload.sub) return null;
  return payload;
}
