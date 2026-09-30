// Web Push sin dependencias: firma VAPID (ES256) con node:crypto y envía un push vacío.
// El contenido del aviso no viaja en el push: el service worker lo pide a /api/inbox.
import { generateKeyPairSync, createSign, createPrivateKey } from "node:crypto";
import { getVapidStored, setVapidIfMissing } from "./store.js";

let cached = null;

/** {publicKey: base64url del punto P-256 sin comprimir, jwk: clave privada} */
export async function getVapid() {
  if (cached) return cached;
  let v = await getVapidStored();
  if (!v) {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = privateKey.export({ format: "jwk" });
    const publicKey = Buffer.concat([
      Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url"),
    ]).toString("base64url");
    await setVapidIfMissing({ publicKey, jwk });
    v = await getVapidStored(); // si otra petición ganó la carrera, usamos la suya
  }
  cached = v;
  return v;
}

const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");

export function vapidJwt(audience, subject, jwk) {
  const data = `${b64({ typ: "JWT", alg: "ES256" })}.${b64({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })}`;
  const sig = createSign("SHA256").update(data)
    .sign({ key: createPrivateKey({ key: jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return `${data}.${sig}`;
}

/** Envía un push vacío. Devuelve el código HTTP (201 ok; 404/410 = suscripción caducada). */
export async function sendPush(sub, subject) {
  const { publicKey, jwk } = await getVapid();
  const aud = new URL(sub.endpoint).origin;
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      Urgency: "high",
      Authorization: `vapid t=${vapidJwt(aud, subject, jwk)}, k=${publicKey}`,
      "Content-Length": "0",
    },
  });
  return r.status;
}
