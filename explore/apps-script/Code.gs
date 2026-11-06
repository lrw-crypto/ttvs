/**
 * 草商探索趣：完成遊戲的名次（Google Apps Script 網頁應用程式）
 *
 * 不需要試算表，也不記任何名字或名單，只記「已經有幾個人完成」。
 * 每個集滿金幣的瀏覽器會拿到一個名次；同一個瀏覽器再問，拿回同一個名次，不會重複計算。
 *
 *   網址                                   → { ok, finished:目前完成人數, limit, left:小禮物剩幾份 }
 *   網址?action=rank&cid=瀏覽器代碼&coins=13 → { ok, rank:第幾名, prize:有沒有小禮物, finished, limit, left }
 *
 * 管理（在編輯器上方選函式，按「執行」）：
 *   showCount  在「執行紀錄」顯示目前完成人數
 *   resetCount 全部歸零，重新開始一輪（測試完、正式開放前記得執行一次）
 */
const PRIZE_LIMIT = 50;   // 前幾名有小禮物；超過的人一樣會看到名次
const COINS_NEEDED = 13;  // 集滿幾枚金幣算完成

function doGet(e) {
  const p = (e && e.parameter) || {};
  return out_(p.action === 'rank' ? rank_(p) : status_(), p.callback);
}

// 舊版網頁用 POST 傳 JSON，一起支援
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ ok: false, error: '資料格式不正確' }); }
  return out_(rank_(body));
}

function rank_(p) {
  const cid = String(p.cid || '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(cid)) return { ok: false, error: '瀏覽器代碼不正確' };
  if (p.coins !== undefined && !(Number(p.coins) >= COINS_NEEDED)) return { ok: false, error: '金幣還沒集滿' };
  const key = 'c' + shortHash_(cid);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);                       // 同時有很多人完成時，一個一個發名次
  try {
    const props = PropertiesService.getScriptProperties();
    let rank = Number(props.getProperty(key) || 0);
    let total = Number(props.getProperty('count') || 0);
    if (!rank) {
      total += 1; rank = total;
      props.setProperties({ count: String(total), [key]: String(rank) });
    }
    return Object.assign({ ok: true, rank: rank, prize: rank <= PRIZE_LIMIT }, summary_(total));
  } finally {
    lock.releaseLock();
  }
}

function status_() {
  return Object.assign({ ok: true }, summary_(Number(PropertiesService.getScriptProperties().getProperty('count') || 0)));
}

function summary_(total) {
  return { finished: total, limit: PRIZE_LIMIT, left: Math.max(0, PRIZE_LIMIT - total) };
}

// 瀏覽器代碼縮成 12 個字元再存，省空間（指令碼屬性上限約 500KB，可記上萬人）
function shortHash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)).slice(0, 12);
}

// 網頁先用 fetch 讀 JSON；萬一被瀏覽器擋下，改用 callback 參數（JSONP）再讀一次
function out_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]{0,40}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function showCount() {
  const n = Number(PropertiesService.getScriptProperties().getProperty('count') || 0);
  Logger.log('目前完成人數：' + n + ' 人（小禮物剩 ' + Math.max(0, PRIZE_LIMIT - n) + ' 份）');
}

function resetCount() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('已歸零，下一位完成的是第 1 名');
}
