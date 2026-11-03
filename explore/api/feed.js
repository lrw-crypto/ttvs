// Vercel Serverless Function：草屯商工島的 Discord 動態中繼站
//   GET  /api/feed  → 網頁讀取最新快照
//   POST /api/feed  → TA Bot 推送快照（需 Authorization: Bearer <FEED_TOKEN>）
// 環境變數：UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN（或 KV_REST_API_URL／KV_REST_API_TOKEN）、FEED_TOKEN

const KEY = 'caotun:feed';
const DEPTS = new Set(['plaza','mech','pipe','data','acct','biz','eng','honor','discord','night','life','sport','cad']);

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(cmd) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

const str = (v, n) => String(v ?? '').replace(/https?:\/\/\S+/g, '[連結]').slice(0, n);

function clean(body) {
  const out = { updatedAt: new Date().toISOString(), online: Math.max(0, Math.min(5000, +body.online || 0)), channels: {}, events: [], activities: [], certs: {} };
  for (const [id, c] of Object.entries(body.channels || {})) {
    if (!DEPTS.has(id)) continue;
    const hourly = Array.isArray(c.hourly) ? c.hourly.slice(-24).map(n => Math.max(0, +n || 0)) : [];
    out.channels[id] = { active: Math.max(0, +c.active || 0), messages24h: Math.max(0, +c.messages24h || 0), hourly };
  }
  for (const e of (body.events || []).slice(-80)) {
    if (!DEPTS.has(e.dept)) continue;
    out.events.push({ id: str(e.id, 40), ts: +e.ts || Date.now(), type: e.type === 'cert' ? 'cert' : 'message', dept: e.dept, user: str(e.user, 24), text: str(e.text, 140), cert: e.cert ? str(e.cert, 60) : undefined });
  }
  for (const a of (body.activities || []).slice(0, 30)) {
    if (!DEPTS.has(a.dept)) continue;
    out.activities.push({ id: str(a.id, 40), dept: a.dept, title: str(a.title, 60), status: ['live','soon','done'].includes(a.status) ? a.status : 'soon', start: str(a.start, 10), end: str(a.end, 10), joined: +a.joined || 0, capacity: +a.capacity || 0 });
  }
  for (const [id, m] of Object.entries(body.certs || {})) {
    if (!DEPTS.has(id)) continue;
    out.certs[id] = {};
    for (const [k, n] of Object.entries(m || {}).slice(0, 20)) out.certs[id][str(k, 40)] = Math.max(0, +n || 0);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !token) return res.status(503).json({ error: '尚未設定 Upstash 環境變數' });
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      if (!raw) return res.status(404).json({ error: 'TA Bot 還沒推送資料' });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(raw);
    }
    if (req.method === 'POST') {
      const auth = req.headers.authorization || '';
      if (!process.env.FEED_TOKEN || auth !== `Bearer ${process.env.FEED_TOKEN}`) return res.status(401).json({ error: 'token 不正確' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const data = clean(body);
      await redis(['SET', KEY, JSON.stringify(data), 'EX', '86400']);
      return res.status(200).json({ ok: true, events: data.events.length });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
