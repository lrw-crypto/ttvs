/**
 * 草商探索趣：完成遊戲人數與小禮物名額（Google Apps Script 版）
 *
 * 放在一份 Google 試算表的「擴充功能 → Apps Script」裡，部署成「網頁應用程式」。
 *   GET  網址            → { limit, claimed, left, finished, today, daily:{日期:人數} }
 *   POST 網址（文字 JSON）{ cid, name, coins }
 *                        → { ok:true, no, ... }          第 no 位兌換者
 *                          { ok:false, soldOut:true, ... } 名額已滿（仍記入完成人數）
 * 同一個瀏覽器（cid）重送拿回同一筆結果，不會重複計算。
 * 第一次使用：在上方選「setup」按「執行」，會建立「完成名單」「統計」兩個工作表。
 */
const PRIZE_LIMIT = 50;          // 小禮物名額
const COINS_NEEDED = 13;         // 集滿幾枚金幣算完成
const SHEET = '完成名單';
const TZ = 'Asia/Taipei';
const HEAD = ['完成時間', '台灣日期', '兌換號碼', '名字', '金幣', '瀏覽器代碼'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('B:B').setNumberFormat('@');
  sh.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  const st = ss.getSheetByName('統計') || ss.insertSheet('統計');
  st.getRange('A1:B4').setValues([
    ['累計完成遊戲人數', "=COUNTA('完成名單'!F2:F)"],
    ['已發出小禮物號碼', "=COUNT('完成名單'!C2:C)"],
    ['剩餘小禮物名額', '=MAX(0,' + PRIZE_LIMIT + '-B2)'],
    ['今天完成人數', "=COUNTIF('完成名單'!B2:B,TEXT(TODAY(),\"yyyy-mm-dd\"))"]
  ]);
  st.getRange('A1:A4').setFontWeight('bold');
  st.setColumnWidth(1, 160);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'claim') return out_(claim_(p));   // 方便用瀏覽器網址測試
  return out_(status_(rows_()));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ error: '資料格式不正確' }); }
  return out_(claim_(body));
}

function claim_(b) {
  const cid = String(b.cid || '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(cid)) return { error: 'cid 格式不正確' };
  const coins = Number(b.coins);
  if (b.coins !== undefined && !(coins >= COINS_NEEDED)) return { error: '金幣還沒集滿' };
  const name = String(b.name || '草商新生').replace(/[<>&"\u0000-\u001f]/g, '').replace(/^[=+\-@\s]+/, '').slice(0, 10) || '草商新生';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rows = rows_();
    const mine = rows.find(r => String(r[5]) === cid);
    if (mine) return result_(mine[2], rows);
    const claimed = rows.filter(r => typeof r[2] === 'number').length;
    const no = claimed < PRIZE_LIMIT ? claimed + 1 : '額滿';
    const now = new Date();
    const row = [now, Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), no, name, coins || COINS_NEEDED, cid];
    sheet_().appendRow(row);
    rows.push(row);
    return result_(no, rows);
  } finally {
    lock.releaseLock();
  }
}

function result_(no, rows) {
  const s = status_(rows);
  return typeof no === 'number' ? Object.assign({ ok: true, no: no }, s) : Object.assign({ ok: false, soldOut: true }, s, { left: 0 });
}

function status_(rows) {
  const claimed = Math.min(PRIZE_LIMIT, rows.filter(r => typeof r[2] === 'number').length);
  const daily = {};
  rows.forEach(r => { const d = day_(r[1]); if (d) daily[d] = (daily[d] || 0) + 1; });
  const keys = Object.keys(daily).sort().slice(-30);
  const recent = {}; keys.forEach(k => recent[k] = daily[k]);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return { limit: PRIZE_LIMIT, claimed: claimed, left: Math.max(0, PRIZE_LIMIT - claimed), finished: rows.length, today: daily[today] || 0, daily: recent };
}

function day_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v || ''); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  if (!sh) throw new Error('找不到「' + SHEET + '」工作表，請先執行 setup');
  return sh;
}

function rows_() {
  const sh = sheet_(); const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEAD.length).getValues().filter(r => r[5] !== '') : [];
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
