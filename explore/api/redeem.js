// Vercel Serverless Function：草商探索趣「集滿金幣換小禮物」名額（預設前 50 名）
//   GET  /api/redeem                      → { limit, claimed, left, finished, today, daily:{日期:人數} }
//   POST /api/redeem  { cid, name }       → { ok:true, no, limit, claimed, left }  第 no 位兌換者
//                                           { ok:false, soldOut:true, limit, claimed, left:0 }
// 同一個瀏覽器（cid）重送會拿回同一個號碼，不會重複佔名額；同一 IP 一天最多領 3 個號碼。
// 完成遊戲人數：每個集滿金幣的瀏覽器都會記一次（名額用完後仍繼續統計），finished = 累計人數、daily = 台灣時間每日新增。
// 環境變數：UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN（或 KV_REST_API_URL／KV_REST_API_TOKEN）
//           PRIZE_LIMIT（選填，預設 50）、ALLOWED_ORIGIN（選填，預設 *）
// 完成人數：SCARD caotun:done:cids；每日：HGETALL caotun:done:daily
// 在 Upstash Console 看名單：HGETALL caotun:prize:claims（cid → 號碼）、HGETALL caotun:prize:names（號碼 → 名字）
// 重新開始一輪：DEL caotun:prize:count caotun:prize:claims caotun:prize:names

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const LIMIT = Math.max(1, Math.min(10000, parseInt(process.env.PRIZE_LIMIT || '50', 10) || 50));
const K = { count: 'caotun:prize:count', claims: 'caotun:prize:claims', names: 'caotun:prize:names', done: 'caotun:done:cids', daily: 'caotun:done:daily' };
const twDate = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// Atomic: same cid → same number; otherwise take the next number unless the limit is reached.
const CLAIM = `
local ex = redis.call('HGET', KEYS[2], ARGV[1])
if ex then return tonumber(ex) end
local n = redis.call('INCR', KEYS[1])
if n > tonumber(ARGV[2]) then redis.call('DECR', KEYS[1]) return -1 end
redis.call('HSET', KEYS[2], ARGV[1], n)
redis.call('HSET', KEYS[3], tostring(n), ARGV[3])
return n`;

async function redis(cmd) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}
const status = async () => {
  const claimed = Math.min(LIMIT, parseInt(await redis(['GET', K.count]) || '0', 10) || 0);
  const finished = parseInt(await redis(['SCARD', K.done]) || '0', 10) || 0;
  const flat = (await redis(['HGETALL', K.daily])) || [];
  const daily = {}; for (let i = 0; i + 1 < flat.length; i += 2) daily[flat[i]] = parseInt(flat[i + 1], 10) || 0;
  const recent = Object.keys(daily).sort().slice(-30).reduce((o, d) => (o[d] = daily[d], o), {});
  return { limit: LIMIT, claimed, left: Math.max(0, LIMIT - claimed), finished, today: daily[twDate()] || 0, daily: recent };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!url || !token) return res.status(503).json({ error: '尚未設定 Upstash 環境變數' });
  try {
    if (req.method === 'GET') return res.status(200).json(await status());
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, OPTIONS'); return res.status(405).json({ error: 'method not allowed' }); }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const cid = String(body.cid || '');
    if (!/^[A-Za-z0-9-]{8,64}$/.test(cid)) return res.status(400).json({ error: 'cid 格式不正確' });
    const name = String(body.name || '草商新生').replace(/[<>&"'\u0000-\u001f]/g, '').slice(0, 10) || '草商新生';
    // 先記「完成遊戲」：每個瀏覽器只算一次，名額用完後仍照常統計
    if (await redis(['SADD', K.done, cid]) === 1) await redis(['HINCRBY', K.daily, twDate(), '1']);
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const known = await redis(['HGET', K.claims, cid]);
    if (!known) {
      const ipKey = 'caotun:prize:ip:' + ip;
      const tries = await redis(['INCR', ipKey]); if (tries === 1) await redis(['EXPIRE', ipKey, '86400']);
      if (tries > 3) return res.status(429).json({ error: '這個網路今天已經領過 3 個名額了' });
    }
    const no = await redis(['EVAL', CLAIM, '3', K.count, K.claims, K.names, cid, String(LIMIT), name]);
    const s = await status();
    if (no === -1) return res.status(200).json({ ok: false, soldOut: true, ...s, left: 0 });
    return res.status(200).json({ ok: true, no, ...s });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
