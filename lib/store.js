// Almacenamiento: Upstash Redis (Vercel Marketplace) mediante su API REST, sin dependencias.
// Cada KDD es un grupo con dos claves: kdd:g:<id>:config (JSON) y kdd:g:<id>:members (hash).
// Los grupos caducan tras 180 días sin actividad.
// Sin credenciales usa memoria (solo para pruebas locales: los datos se pierden al reiniciar).

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(url && token);
if (!useRedis) console.warn("[kdd] Sin Redis configurado: usando memoria.");

const TTL = 60 * 60 * 24 * 180;
const K = {
  config: g => `kdd:g:${g}:config`,
  members: g => `kdd:g:${g}:members`,
};
const mem = { kv: new Map(), hash: new Map() };

async function pipeline(commands) {
  const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(data)) throw new Error("Redis: " + ((data && data.error) || r.status));
  for (const d of data) if (d && d.error) throw new Error("Redis: " + d.error);
  return data.map(d => d.result);
}
const redis = async (...cmd) => (await pipeline([cmd]))[0];

const parse = v => { try { return v == null ? null : JSON.parse(v); } catch { return null; } };
const memHash = k => { if (!mem.hash.has(k)) mem.hash.set(k, new Map()); return mem.hash.get(k); };

/** Renueva la caducidad del grupo (se llama en cada escritura). */
const touch = g => [["EXPIRE", K.config(g), TTL], ["EXPIRE", K.members(g), TTL]];

export async function getConfig(g) {
  if (!useRedis) return parse(mem.kv.get(K.config(g)));
  return parse(await redis("GET", K.config(g)));
}

export async function saveConfig(g, c) {
  if (!useRedis) { mem.kv.set(K.config(g), JSON.stringify(c)); return; }
  await pipeline([["SET", K.config(g), JSON.stringify(c)], ...touch(g)]);
}

export async function getMembers(g) {
  if (!useRedis) return [...memHash(K.members(g)).values()].map(parse);
  const flat = (await redis("HGETALL", K.members(g))) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) { const m = parse(flat[i]); if (m) out.push(m); }
  return out;
}

export async function getMember(g, id) {
  if (!useRedis) return parse(memHash(K.members(g)).get(id));
  return parse(await redis("HGET", K.members(g), id));
}

export async function saveMember(g, m) {
  if (!useRedis) { memHash(K.members(g)).set(m.id, JSON.stringify(m)); return; }
  await pipeline([["HSET", K.members(g), m.id, JSON.stringify(m)], ...touch(g)]);
}

export async function deleteMember(g, id) {
  if (!useRedis) { memHash(K.members(g)).delete(id); return; }
  await pipeline([["HDEL", K.members(g), id], ...touch(g)]);
}
