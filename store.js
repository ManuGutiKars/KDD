// Almacenamiento: Upstash Redis (Vercel Marketplace) mediante su API REST, sin dependencias.
//   kdd2:g:<grupo>:config    JSON con los ajustes de la KDD
//   kdd2:g:<grupo>:members   hash  uid -> JSON del miembro
//   kdd2:u:<uid>:groups      set   de grupos en los que está cada usuario
// Los grupos caducan tras 180 días sin actividad.
// Sin credenciales usa memoria (solo para pruebas locales: los datos se pierden al reiniciar).

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(url && token);
if (!useRedis) console.warn("[kdd] Sin Redis configurado: usando memoria.");

const TTL = 60 * 60 * 24 * 180;
const K = {
  config: g => `kdd2:g:${g}:config`,
  members: g => `kdd2:g:${g}:members`,
  groups: u => `kdd2:u:${u}:groups`,
};

/* ---- memoria local (pruebas) con la misma semántica que Redis ---- */
const mem = { kv: new Map(), hash: new Map(), set: new Map() };
const box = (m, k) => { if (!m.has(k)) m.set(k, m === mem.set ? new Set() : new Map()); return m.get(k); };
function memRun([cmd, ...a]) {
  switch (cmd) {
    case "GET": return mem.kv.get(a[0]) ?? null;
    case "SET": mem.kv.set(a[0], a[1]); return "OK";
    case "HGET": return box(mem.hash, a[0]).get(a[1]) ?? null;
    case "HSET": box(mem.hash, a[0]).set(a[1], a[2]); return 1;
    case "HDEL": return box(mem.hash, a[0]).delete(a[1]) ? 1 : 0;
    case "HGETALL": return [...box(mem.hash, a[0])].flat();
    case "SADD": box(mem.set, a[0]).add(a[1]); return 1;
    case "SREM": return box(mem.set, a[0]).delete(a[1]) ? 1 : 0;
    case "SMEMBERS": return [...box(mem.set, a[0])];
    case "EXPIRE": return 1;
  }
  throw new Error("Comando no soportado en memoria: " + cmd);
}

async function pipeline(commands) {
  if (!useRedis) return commands.map(memRun);
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
const one = async (...cmd) => (await pipeline([cmd]))[0];

const parse = v => { try { return v == null ? null : JSON.parse(v); } catch { return null; } };
const touch = g => [["EXPIRE", K.config(g), TTL], ["EXPIRE", K.members(g), TTL]];

export async function getConfig(g) { return parse(await one("GET", K.config(g))); }

export async function saveConfig(g, c) {
  await pipeline([["SET", K.config(g), JSON.stringify(c)], ...touch(g)]);
}

export async function getMembers(g) {
  const flat = (await one("HGETALL", K.members(g))) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) { const m = parse(flat[i]); if (m) out.push(m); }
  return out;
}

export async function getMember(g, uid) { return parse(await one("HGET", K.members(g), uid)); }

export async function saveMember(g, m) {
  await pipeline([
    ["HSET", K.members(g), m.id, JSON.stringify(m)], ...touch(g),
    ["SADD", K.groups(m.id), g], ["EXPIRE", K.groups(m.id), TTL * 2],
  ]);
}

export async function deleteMember(g, uid) {
  await pipeline([["HDEL", K.members(g), uid], ["SREM", K.groups(uid), g], ...touch(g)]);
}

/** Las KDD de un usuario: [{g, title, admin}], de la más reciente a la más antigua. */
export async function getUserGroups(uid) {
  const gs = (await one("SMEMBERS", K.groups(uid))) || [];
  if (!gs.length) return [];
  const res = await pipeline(gs.flatMap(g => [["GET", K.config(g)], ["HGET", K.members(g), uid]]));
  const out = [], stale = [];
  gs.forEach((g, i) => {
    const c = parse(res[i * 2]), m = parse(res[i * 2 + 1]);
    if (c && m) out.push({ g, title: c.title, admin: !!m.admin, joinedAt: m.joinedAt || 0 });
    else stale.push(["SREM", K.groups(uid), g]); // grupo caducado o te quitaron
  });
  if (stale.length) pipeline(stale).catch(() => {});
  return out.sort((a, b) => b.joinedAt - a.joinedAt);
}
