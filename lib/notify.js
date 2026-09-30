// Avisos de la app: "¡Hay KDD!" cuando todos coinciden y "X se ha unido" para quien organiza.
import { pushInbox, getSubs, removeSub, saveConfig } from "./store.js";
import { sendPush } from "./push.js";

export const originOf = req =>
  `https://${req.headers["x-forwarded-host"] || req.headers.host || "localhost"}`;

/** Guarda el aviso en la bandeja de cada usuario y despierta sus dispositivos. Nunca lanza. */
export async function notifyUsers(uids, item, origin) {
  const at = Date.now();
  await Promise.allSettled(uids.map(async uid => {
    await pushInbox(uid, { ...item, at });
    const subs = await getSubs(uid);
    await Promise.allSettled(subs.map(async sub => {
      const status = await sendPush(sub, origin);
      if (status === 404 || status === 410) await removeSub(uid, sub.endpoint);
      else if (status >= 400) console.warn("[kdd] push", status, new URL(sub.endpoint).host);
    }));
  }));
}

const todayMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Primer día (desde hoy) que han marcado todos; null si no hay o si sois menos de 2. */
export function firstMatch(members) {
  if (members.length < 2) return null;
  const today = todayMadrid();
  const [first, ...rest] = members;
  const common = (first.days || []).filter(d => d >= today && rest.every(m => (m.days || []).includes(d)));
  return common.sort()[0] || null;
}

export function longDateEs(k) {
  const [y, m, d] = k.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tras un cambio: si aparece una KDD nueva (o cambia de día), avisa a todos una sola vez. */
export async function checkMatch(g, config, members, origin) {
  const match = firstMatch(members);
  if (match === (config.notified || null)) return;
  await saveConfig(g, { ...config, notified: match });
  if (!match) return;
  await notifyUsers(members.map(m => m.id), {
    title: `¡Hay ${config.title || "KDD"}!`,
    body: `${longDateEs(match)} a las ${config.time || "20:00"}. Podéis todos: añádelo a tu calendario.`,
    url: `/?kdd=${g}`,
    tag: `kdd-${g}`,
  }, origin);
}
