import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// A local static fixture also serves /115/ and /ttvs/ to verify relative URLs.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = process.env.SITE_DIR ? resolve(root, process.env.SITE_DIR) : root;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    path = path.replace(/^\/(115|ttvs)\//, '/');
    const file = resolve(siteRoot, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    if (!file.startsWith(siteRoot + sep)) throw new Error('Invalid path');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
await mkdir(resolve(root, 'test-results'), { recursive: true });
const errors = [];
let lastPage;
let checks = 0;
function passed(message) { checks++; process.stdout.write(`✓ ${message}\n`); }
function observe(page) {
  lastPage=page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}
const storageKey = 'ttvs.moe-shop.game.v1';
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
const dialog = page => page.locator('#game-dialog[open]');
const act = (page, name, extra = '') => dialog(page).locator(`[data-action="${name}"]${extra}`);
const text = async (locator, expected) => assert.match(await locator.textContent(), expected);
async function close(page) { await act(page, 'close').first().click(); await page.locator('#game-dialog').waitFor({ state: 'hidden' }); }
async function tapOrClick(locator, touch) { if (touch) await locator.tap(); else await locator.click(); }
async function drag(page, source, target, touch = false) {
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  assert(a && b);
  const x1 = a.x + a.width / 2, y1 = a.y + a.height / 2;
  const x2 = b.x + b.width / 2, y2 = b.y + b.height / 2;
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2-x1)*i/8, y: y1 + (y2-y1)*i/8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    // Allow Chromium to finish the low-level drag gesture before its next synthetic tap.
    await page.waitForTimeout(400);
  } else {
    await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 8 }); await page.mouse.up();
  }
}
async function enter(page, touch) {
  await page.goto(`${base}/ttvs/`);
  await tapOrClick(page.locator('[data-action="enter"]'), touch);
  await dialog(page).locator('#shop-name').fill('測試萌萌店');
  await dialog(page).locator('input[value="peach"]').check();
  await dialog(page).locator('button[type="submit"]').click();
  await page.locator('#game-dialog').waitFor({ state: 'hidden' });
  assert.equal((await stored(page)).name, '測試萌萌店');
  assert.equal((await stored(page)).avatar, 'peach');
  await page.waitForFunction(()=>document.activeElement?.matches('.back-link'));
  await page.locator('.bottom-actions [data-action="decor"]').click();
  await act(page,'decor-apply','[data-group="sign"]').click();
  await text(dialog(page).locator('#feedback'),/星星不足/);
  await close(page);
  passed(`${touch?'觸控':'桌面'}：首頁入口、店名與角色選擇、星星不足不扣款`);
}
async function keyboardModal(page) {
  const trigger=page.locator('.bottom-actions [data-action="tasks"]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await dialog(page).waitFor();
  await page.waitForFunction(()=>document.querySelector('dialog').contains(document.activeElement));
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),true);
  for(let i=0;i<10;i++){
    await page.keyboard.press('Tab');
    assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),'Tab must remain inside modal');
  }
  await page.keyboard.press('Escape');
  await page.locator('#game-dialog').waitFor({state:'hidden'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
  passed('鍵盤開啟視窗、焦點移入與圈限、Escape 關閉並恢復焦點及背景操作');
}
async function cancelTrial(page) {
  const before=await stored(page);
  await page.locator('.journey-list [data-index="1"]').click();
  await act(page,'run-rules').click();
  await page.keyboard.press('Escape');
  await page.locator('#game-dialog').waitFor({state:'hidden'});
  await page.locator('.journey-list [data-index="1"]').click();
  await page.waitForTimeout(900);
  assert.equal(await dialog(page).locator('.test-result,.run-status').count(),0);
  assert.equal(await act(page,'run-rules').isEnabled(),true);
  assert.deepEqual((await stored(page)).completed,before.completed);
  assert.equal((await stored(page)).stars,before.stars);
  await close(page);
  passed('試跑期間 Escape 取消會清理計時器，重新開啟不受延遲結果影響');
}
async function taskOne(page, touch, removeSecond = false) {
  await page.locator('.journey-list [data-index="0"]').click();
  const actions=await page.evaluate(()=>({body:getComputedStyle(document.body).touchAction,html:getComputedStyle(document.documentElement).touchAction,app:getComputedStyle(document.querySelector('#app')).touchAction,modal:getComputedStyle(document.querySelector('dialog')).touchAction,card:getComputedStyle(document.querySelector('[data-pick]')).touchAction}));
  for(const scope of ['body','html','app','modal'])assert.notEqual(actions[scope],'none',`${scope} must not globally disable gestures`);
  assert.equal(actions.card,'none');
  await tapOrClick(dialog(page).locator('[data-pick="quantity"]'), touch);
  await tapOrClick(dialog(page).locator('[data-drop="customer"]'), touch);
  await text(dialog(page).locator('#feedback'), /表示買幾杯.*數量欄/);
  await drag(page, dialog(page).locator('[data-pick="id"]'), dialog(page).locator('[data-drop="id"]'), touch);
  await text(dialog(page).locator('[data-drop="id"]'), /A101/);
  for (const key of ['customer','product','quantity']) {
    await tapOrClick(dialog(page).locator(`[data-pick="${key}"]`), touch);
    await tapOrClick(dialog(page).locator(`[data-drop="${key}"]`), touch);
    await text(dialog(page).locator(`[data-drop="${key}"]`),new RegExp(({customer:'小晴',product:'奶茶',quantity:'2'})[key]));
  }
  if(touch)await page.screenshot({path:resolve(root,'test-results/mobile-task1.png'),fullPage:true});
  await act(page, 'fields-check').click();
  await text(dialog(page).locator('#dialog-title'),/找出重複的訂單/);
  await act(page, 'remove-order', '[data-index="3"]').click();
  await text(dialog(page).locator('#feedback'), /同一位顧客可以再次購買/);
  assert.equal(await dialog(page).locator('.order-row').count(), 4);
  await act(page, 'remove-order', `[data-index="${removeSecond?2:0}"]`).click();
  assert.equal(await dialog(page).locator('.order-row').count(), 3);
  assert.equal(await dialog(page).locator('.order-id', { hasText: 'A101' }).count(), 1);
  await act(page, 'dedup-check').click();
  await text(dialog(page).locator('#dialog-title'), /原來這就是資料整理/);
  await close(page);
  assert.equal((await stored(page)).stars, 2);
  assert.equal(await page.locator('.scene-region .shop-hotspot.is-unlocked').count(), 1);
  passed(`${touch?'觸控拖曳＋點選':'滑鼠拖曳＋點選'}：欄位提示、A103 保留、任一 A101 可移除、設備升級`);
}
async function taskTwo(page, touch) {
  await page.locator('.journey-list [data-index="1"]').click();
  assert.equal(await dialog(page).locator('.rule-slot', { hasText:'尚未設定' }).count(), 2);
  for (const branch of ['cold', 'hot']) {
    await tapOrClick(dialog(page).locator('[data-pick="cold"]'),touch);
    await tapOrClick(dialog(page).locator(`[data-drop="${branch}"]`),touch);
  }
  await act(page,'run-rules').click();
  await page.waitForFunction(()=>document.querySelector('.run-status')?.textContent.includes('正確 2 / 3'));
  assert.equal(await dialog(page).locator('.test-result.fail').count(),1);
  await text(dialog(page).locator('.test-result.fail'),/熱可可.*冷飲杯/s);
  assert.equal((await stored(page)).completed[1], false);
  await tapOrClick(dialog(page).locator('[data-pick="hot"]'),touch);
  await tapOrClick(dialog(page).locator('[data-drop="hot"]'),touch);
  await act(page,'run-rules').click();
  await act(page,'rules-complete').waitFor();
  await text(dialog(page).locator('.run-status'),/正確 3 \/ 3/);
  await act(page,'rules-complete').click();
  await close(page);
  assert.equal((await stored(page)).stars,4);
  assert.equal(await page.locator('.scene-region .shop-hotspot.is-unlocked').count(),2);
  passed(`${touch?'觸控':'桌面'}：錯誤分支真實得到 2/3，修正後 3/3 才解鎖助手`);
}
async function taskThree(page, touch) {
  await page.locator('.journey-list [data-index="2"]').click();
  for(const key of ['2','0','1']) await tapOrClick(dialog(page).locator(`[data-pick="${key}"]`),touch);
  await act(page,'formula-apply').click();
  await text(dialog(page).locator('#feedback'),/單價 × 銷量/);
  await act(page,'formula-reset').click();
  for(const key of ['0','1','2']) await tapOrClick(dialog(page).locator(`[data-pick="${key}"]`),touch);
  await text(dialog(page).locator('.cell-formula'),/=B2\*C2/);
  await act(page,'formula-apply').click();
  for(const amount of [240,200,140]) await text(dialog(page).locator('.sales-table tbody'),new RegExp(`${amount} 元`));
  await text(dialog(page).locator('.sales-table tfoot'),/580 元/);
  await act(page,'analysis-chart').click();
  await act(page,'answer','[data-product="milk"]').click();
  await text(dialog(page).locator('#feedback'),/餅乾賣出 8 份/);
  await act(page,'answer','[data-product="cookie"]').click();
  await act(page,'answer','[data-product="cookie"]').click();
  await text(dialog(page).locator('#feedback'),/奶茶 240 元/);
  await act(page,'answer','[data-product="milk"]').click();
  await close(page);
  assert.equal((await stored(page)).stars,6);
  assert.equal(await page.locator('.scene-region .shop-hotspot.is-unlocked').count(),3);
  await text(page.locator('.scene-region .shop-art'),/人氣餅乾/);
  passed(`${touch?'觸控':'桌面'}：公式驗證、240/200/140/580、雙圖表決策與展示櫃`);
}
async function festival(page, touch, bridge = false) {
  await page.locator('.festival-entry').click();
  await act(page,'festival-dedup').click();
  await text(dialog(page).locator('#feedback'),/重複 F201/);
  await act(page,'festival-remove','[data-index="2"]').click();
  await act(page,'festival-dedup').click();
  await act(page,'festival-serve').click();
  await act(page,'festival-calculate').waitFor();
  await text(dialog(page).locator('.run-status'),/正確 3 \/ 3/);
  await act(page,'festival-calculate').click();
  await text(dialog(page).locator('#dialog-title'),/智慧小店開幕成功/);
  const numbers=await dialog(page).locator('.final-numbers strong').allTextContents();
  assert.deepEqual(numbers,['3','4','165']);
  await text(dialog(page).locator('.receipt'),/80 元[\s\S]*50 元[\s\S]*35 元[\s\S]*165 元/);
  await text(dialog(page).locator('.badge-unlocked'),/資處小店長/);
  assert.equal((await stored(page)).finalComplete,true);
  if(!bridge)assert.equal((await stored(page)).websiteRewardHandled,false);
  await page.screenshot({path:resolve(root,`test-results/${touch?'mobile':'desktop'}-completion.png`),fullPage:true});
  await close(page);
  await text(page.locator('.level-badge'),/Lv.4/);
  passed(`${touch?'觸控':'桌面'}：校慶去重、實際出餐、3 筆／4 杯／165 元、徽章`);
}
async function decorAndReplay(page) {
  await page.locator('.bottom-actions [data-action="decor"]').click();
  await act(page,'decor-preview','[data-group="sign"][data-value="pink"]').click();
  assert.equal((await stored(page)).decor.sign,'mint');
  for (const group of ['sign','chair','plant']) await act(page,'decor-apply',`[data-group="${group}"]`).click();
  assert.equal((await stored(page)).stars,0);
  for(const group of ['sign','chair','plant']) await act(page,'decor-apply',`[data-group="${group}"]`).click();
  assert.equal((await stored(page)).stars,0);
  assert.equal((await stored(page)).decor.sign,'pink');
  await act(page,'decor-preview','[data-group="chair"][data-value="bear"]').click();
  await act(page,'decor-apply','[data-group="chair"]').click();
  await close(page);
  await page.reload();
  assert.equal((await stored(page)).decor.chair,'bear');
  assert.equal((await stored(page)).finalComplete,true);
  await page.locator('.journey-list [data-index="0"]').click();
  for(const key of ['id','customer','product','quantity']) {
    await dialog(page).locator(`[data-pick="${key}"]`).click();
    await dialog(page).locator(`[data-drop="${key}"]`).click();
  }
  await act(page,'fields-check').click();
  await act(page,'remove-order','[data-index="2"]').click();
  await act(page,'dedup-check').click();
  await text(dialog(page).locator('.upgrade-reward'),/首次獎勵已領取/);
  assert.equal((await stored(page)).stars,0);
  await close(page);
  await page.screenshot({path:resolve(root,'test-results/desktop-shop.png'),fullPage:true});
  passed('裝飾先預覽、三組購買與免費切換、重複扣款防護、重整與重玩不重領');
}
try {
  const directContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const directPage=await directContext.newPage();observe(directPage);
  await directPage.goto(`${base}/ttvs/#shop`);
  await dialog(directPage).locator('#shop-name').waitFor();
  assert.equal(await directPage.locator('.shop-layout').count(),1);
  assert.equal(await directPage.locator('.game-cover').count(),0);
  await directPage.keyboard.press('Escape');
  assert.equal(await directPage.locator('.scene-region .shop-hotspot').count(),3);
  passed('直接開啟 /ttvs/#shop 即顯示店面，新玩家進入店長設定，不會停在封面');
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await desktop.newPage();observe(page);
  await page.goto(`${base}/ttvs/`);
  await page.screenshot({path:resolve(root,'test-results/desktop-home.png'),fullPage:true});
  await enter(page,false);await keyboardModal(page);await taskOne(page,false);await taskTwo(page,false);await cancelTrial(page);await taskThree(page,false);await festival(page,false);await decorAndReplay(page);
  for (const width of [390,768,1024,1440]) {
    await page.setViewportSize({width,height:width===1024?768:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${width}`);
    await page.locator('.bottom-actions [data-action="results"]').click();
    assert(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+1),`Modal overflow at ${width}`);
    await close(page);
  }
  passed('390 / 768 / 1024 / 1440 模擬尺寸無頁面與成果視窗水平溢出');
  await page.goto(`${base}/115/`);
  await page.locator('[data-action="enter"]').click();
  await page.locator('.scene-region .shop-art').waitFor();
  await page.locator('.back-link').click();
  await page.locator('[data-action="enter"]').waitFor();
  passed('/ttvs/ 與 /115/ 子路徑載入、首頁返回與重新進入');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',deviceScaleFactor:2});
  const touchPage=await mobile.newPage();observe(touchPage);
  await enter(touchPage,true);await taskOne(touchPage,true,true);await taskTwo(touchPage,true);await taskThree(touchPage,true);await festival(touchPage,true);
  const broken=await browser.newContext({viewport:{width:390,height:844}});
  const brokenPage=await broken.newPage();observe(brokenPage);
  await brokenPage.addInitScript(key=>localStorage.setItem(key,'{bad json'),storageKey);
  await brokenPage.goto(`${base}/ttvs/`);
  await text(brokenPage.locator('#toast'),/存檔損壞/);
  await brokenPage.locator('[data-action="enter"]').click();
  await brokenPage.locator('#shop-name').waitFor();
  passed('損壞存檔安全降級，不白屏');
  const blocked=await browser.newContext({viewport:{width:390,height:844}});
  const blockedPage=await blocked.newPage();observe(blockedPage);
  await blockedPage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}}));
  await blockedPage.goto(`${base}/ttvs/`);
  await text(blockedPage.locator('.storage-banner'),/本次進度無法保存/);
  await blockedPage.locator('[data-action="enter"]').click();
  await blockedPage.locator('#shop-name').fill('<b>安全店名');
  await dialog(blockedPage).locator('button[type="submit"]').click();
  await blockedPage.locator('#game-dialog').waitFor({state:'hidden'});
  await text(blockedPage.locator('.store-identity h1'),/<b>安全店名/);
  assert.equal(await blockedPage.locator('.store-identity h1 b').count(),0);
  await blockedPage.locator('.journey-list [data-index="0"]').click();
  await dialog(blockedPage).locator('[data-pick="id"]').click();
  await dialog(blockedPage).locator('[data-drop="id"]').click();
  await text(dialog(blockedPage).locator('[data-drop="id"]'),/A101/);
  passed('localStorage 被拒時仍可玩、明確提示、店名安全文字渲染');
  // Real host integration is optional. Only an acknowledged receipt marks it handled.
  const bridgeContext=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
  const bridgePage=await bridgeContext.newPage();observe(bridgePage);
  const ready={...(await stored(page)),finalComplete:false,websiteRewardHandled:false};
  await bridgePage.addInitScript(({key,ready})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(ready));
    window.TTVSCampusBridge={departmentId:'host-data-processing',async awardDepartment(payload){
      if(payload.departmentId!=='host-data-processing')throw Error('Wrong department');
      sessionStorage.setItem('test-reward-calls',String(Number(sessionStorage.getItem('test-reward-calls')||0)+1));
      return {handled:true};
    }};
  },{key:storageKey,ready});
  await bridgePage.goto(`${base}/ttvs/#shop`);
  await festival(bridgePage,false,true);
  await bridgePage.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).websiteRewardHandled,storageKey);
  await bridgePage.reload();
  await festival(bridgePage,false,true);
  assert.equal(await bridgePage.evaluate(()=>sessionStorage.getItem('test-reward-calls')),'1');
  passed('可選校園介面只有真實回執才記錄獎勵、重整重玩不重複呼叫');
  assert.deepEqual(errors,[],`Unexpected browser/asset errors:\n${errors.join('\n')}`);
  passed('無新增未處理 console/page error 或素材 404');
  console.log(`\n${checks} 組瀏覽器驗證通過。模擬尺寸與觸控不等於實機 iPad 測試。`);
} catch(error) {
  if(lastPage){await lastPage.screenshot({path:resolve(root,'test-results/failure.png'),fullPage:true}); console.log(await lastPage.locator('#game-dialog').innerText());}
  throw error;
} finally { await browser.close();await new Promise(resolve=>server.close(resolve)); }
