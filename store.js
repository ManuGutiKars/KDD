// Almacenamiento: Upstash Redis (Vercel Marketplace) mediante su API REST, sin dependencias.
// Sin credenciales usa memoria (solo para pruebas locales: los datos se pierden al reiniciar).

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(url && token);
if (!useRedis) console.warn("[kdd] Sin Redis configurado: usando memoria.");

const MEMBERS = "kdd:members";
const CONFIG = "kdd:config";
const mem = { members: new Map(), config: null };

async function redis(...command) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error("Redis: " + (data.error || r.status));
  return data.result;
}

const parse = v => { try { return v == null ? null : JSON.parse(v); } catch { return null; } };

export async function getMembers() {
  if (!useRedis) return [...mem.members.values()];
  const flat = (await redis("HGETALL", MEMBERS)) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) { const m = parse(flat[i]); if (m) out.push(m); }
  return out;
}

export async function getMember(id) {
  if (!useRedis) return mem.members.get(id) || null;
  return parse(await redis("HGET", MEMBERS, id));
}

export async function saveMember(m) {
  if (!useRedis) { mem.members.set(m.id, m); return; }
  await redis("HSET", MEMBERS, m.id, JSON.stringify(m));
}

export async function deleteMember(id) {
  if (!useRedis) { mem.members.delete(id); return; }
  await redis("HDEL", MEMBERS, id);
}

export async function getConfig() {
  if (!useRedis) return mem.config || {};
  return parse(await redis("GET", CONFIG)) || {};
}

export async function saveConfig(c) {
  if (!useRedis) { mem.config = c; return; }
  await redis("SET", CONFIG, JSON.stringify(c));
}
