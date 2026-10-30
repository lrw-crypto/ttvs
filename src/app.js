import { renderScene, avatarSvg, robotSvg } from './scene.js';
import { loadState, saveState, completeTask, purchaseDecoration, removeDuplicate, runRules, summarizeOrders, finishFestival, SALES, TRAINING_ORDERS, SERVICE_ORDERS, FESTIVAL_ORDERS } from './game.js';
import { processCampusReward } from './integration.js';

const loaded = loadState();
const state = loaded.state;
const app = document.querySelector('#app');
const dialog = document.querySelector('#game-dialog');
const toastElement = document.querySelector('#toast');
let persistent = loaded.persistent;
let selected = null;
let currentView = null;
let viewData = {};
let restoreFocus = null;
let toastTimer;
let timers = new Map();
let runToken = 0;
let running = false;
let preview = null;
let drag = null;
const names = ['訂單整理員', '自動服務工程師', '銷售分析師'];
const skills = ['資料整理', '程式邏輯', '試算表分析'];
const descriptions = ['把資料分類、建立欄位，找出重複紀錄。', '設定條件，讓電腦依規則完成工作。', '利用公式與圖表，從數字中找到答案。'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => {
  const paths = {shop:'M3 10h18M5 10v11h14V10M3 10l3-7h12l3 7M9 21v-7h6v7M9 3l-1 7m7-7 1 7',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',arrow:'m10 6-6 6 6 6M4 12h16',tasks:'M9 5h11M9 12h11M9 19h11M3 5l1 1 2-3M3 12l1 1 2-3M3 19l1 1 2-3',decor:'m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm7 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z',award:'M8 3h8l2 4-2 7H8L6 7Zm1 11-2 8 5-3 5 3-2-8M10 7h4',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',play:'m8 4 12 8-12 8Z',leaf:'M20 3C7 1 2 8 7 15c7 5 14 0 13-12ZM4 21 16 8',chart:'M4 3v18h17M8 17v-5m5 5V7m5 10V4',cup:'M5 7h12v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3ZM17 8h2a3 3 0 0 1 0 6h-2M8 3v1m5-1v1',info:'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.shop}"/></svg>`;
};
const btn = (action, label, cls = 'primary', attrs = '') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const level = () => state.finalComplete ? 4 : 1 + Number(state.completed[0]) + Number(state.completed[1]);
const count = () => state.completed.filter(Boolean).length;

function toast(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 4400);
}
function persist() {
  if (!saveState(state)) {
    if (persistent) toast('目前瀏覽器無法保存進度，你仍可繼續遊玩。離開頁面後可能遺失本次進度。');
    persistent = false;
  }
}
function render() {
  const home = location.hash !== '#shop';
  app.innerHTML = `<header class="topbar"><a class="brand" href="#home" aria-label="資處萌萌店長首頁"><span class="brand-icon">${icon('shop')}</span><span>資處萌萌店長<small>MOE MOE SHOP</small></span></a><span class="header-note">校園小店 × 資訊大冒險</span><span class="edition">一起開店 · 慢慢玩</span></header>
    ${!persistent ? '<div class="storage-banner" role="status">本次進度無法保存；遊戲仍可正常操作，請勿關閉或重新整理頁面。</div>' : ''}
    ${home ? homeHTML() : shopHTML()}
    <footer class="site-footer"><span>一間小店，三種資訊超能力。</span><span>資料處理科 · 互動學習體驗</span></footer>`;
}
function homeHTML() {
  return `<main class="game-cover"><header class="cover-title"><span class="cover-ribbon">資料處理科 · 互動經營小遊戲</span><h1>資處萌萌<span>店長</span></h1><p>用資訊小技能，開一間智慧小店！</p></header><section class="cover-world home-scene" aria-label="資處萌萌店長的花園小店">${renderScene(state,{interactive:false})}<span class="cover-sticker">整理訂單<br>小店升級！</span></section><div class="cover-start">${btn('enter',`${icon('play')}${state.started?'繼續經營':'開始經營'}｜資處萌萌店長`,'primary hero-cta')}<p>約 5–8 分鐘 · 沒有倒數 · 進度自動保存</p><details class="cover-howto"><summary>怎麼玩？</summary><p>整理訂單、設定助手規則，再用公式與圖表找答案。完成三個任務，就能迎接校慶開幕日！設備會加入店內，星星可以自由裝飾小店。</p></details><a class="direct-entry" href="#shop">直接進入店面 →</a></div></main>`;
}
function shopHTML() {
  const next = state.completed.findIndex(x=>!x);
  return `<main class="shop-layout"><div class="shop-heading"><a class="back-link" href="#home">${icon('arrow')}返回首頁</a><span class="manager-token">${avatarSvg(state.avatar)}</span><div class="store-identity"><span class="eyebrow">MY LITTLE SMART SHOP</span><h1>${esc(state.name)}<span class="level-badge">Lv.${level()} ${state.finalComplete?'校園明星店':'成長中的小店'}</span></h1></div><div class="stats"><span class="star-pill">${icon('star')}<strong>${state.stars}</strong><small>裝飾星星</small></span><span class="progress-pill"><strong>${count()} <small>/ 3</small></strong><small>任務完成</small></span></div></div>
    <div class="game-grid"><aside class="journey"><div class="section-kicker">SHOP JOURNEY</div><h2>今天也讓小店<br>進步一點點。</h2><p class="muted">點選設備或任務，開始你的店長日常。</p><ol class="journey-list">${names.map((name,i)=>`<li class="${state.completed[i]?'done': next===i?'current':''}"><button data-action="task" data-index="${i}" ${i>0&&!state.completed[i-1]?'disabled':''}><span class="step-number">${icon(state.completed[i]?'check':['tasks','cup','chart'][i])}</span><span><strong>${name}</strong><small>${skills[i]}${state.completed[i]?' · 已完成':''}</small></span>${state.completed[i]?'<span class="tiny-done">完成</span>':''}</button></li>`).join('')}</ol><button class="festival-entry ${state.finalComplete?'completed':''}" data-action="festival" ${count()<3?'disabled':''}>${icon('award')}<span><strong>校慶開幕日</strong><small>${state.finalComplete?'已開幕 · 歡迎再次挑戰': count()<3?'完成三項任務後解鎖':'準備好了，迎接校慶！'}</small></span><span>↗</span></button><div class="journey-note">${icon('info')}設備隨任務升級，裝飾自由選。<br>不用花星星，也能完整通關。</div></aside>
    <section class="shop-stage" aria-label="我的店面"><div class="stage-top"><span><i class="live-dot"></i>${state.finalComplete?'校慶營業中':'小店準備中'}</span><span>點選店內設備，動手試試看</span></div><div class="scene-region">${renderScene(state)}</div><div class="stage-message">${icon(state.finalComplete?'award':'leaf')}<span>${state.finalComplete?'智慧小店開幕成功！你是資處小店長。':count()===0?'歡迎新店長！先把混在一起的訂單整理好吧。':count()===1?'電子訂單機上線了！接著教助手正確出餐。':count()===2?'助手學會分冷熱了！來看看今天的銷售數字。':'設備全到齊！準備迎接校慶開幕日。'}</span></div></section></div>
    <nav class="bottom-actions" aria-label="店長操作">${btn('tasks',`${icon('tasks')}<span>任務<small>讓小店升級</small></span>`,'nav-button')}${btn('decor',`${icon('decor')}<span>裝飾<small>佈置你的風格</small></span>`,'nav-button')}${btn('results',`${icon('award')}<span>我的成果<small>收集成長足跡</small></span>`,'nav-button')}</nav></main>`;
}
function cancelRun() {
  runToken++;
  timers.forEach((resolve,id)=>{clearTimeout(id);resolve(false);});
  timers.clear();
  running = false;
  drag?.ghost?.remove();
  drag=null;
  document.querySelector('.scene-region')?.classList.remove('is-serving');
}
function closeModal() {
  cancelRun();
  preview = null;
  if (dialog.open) dialog.close();
  app.inert = false;
  document.body.classList.remove('modal-open');
  currentView = null;
  selected = null;
  const canRestore=restoreFocus?.isConnected && restoreFocus.matches('button,a[href],input,select,textarea,[tabindex]') && !restoreFocus.disabled && restoreFocus.getClientRects().length>0;
  if(canRestore)restoreFocus.focus();
  if(!canRestore || document.activeElement!==restoreFocus)document.querySelector(location.hash==='#shop'?'.back-link':'.hero-cta')?.focus();
}
function openModal(view, data = {}) {
  cancelRun();
  if (!dialog.open) restoreFocus = document.activeElement;
  currentView = view;
  viewData = data;
  selected = null;
  drawModal();
  if (!dialog.open) dialog.showModal();
  app.inert = true;
  document.body.classList.add('modal-open');
  dialog.scrollTop = 0;
  requestAnimationFrame(()=>dialog.querySelector('input, button:not(.close-modal)')?.focus());
}
function shell(title, subtitle, body, wide = false) {
  return `<div class="dialog-shell ${wide?'wide':''}"><header class="dialog-header"><div><span class="eyebrow">${subtitle}</span><h2 id="dialog-title">${title}</h2></div>${btn('close', icon('close'),'close-modal','aria-label="關閉視窗"')}</header>${body}</div>`;
}
function feedback(message = '', good = false) {
  return `<p id="feedback" class="feedback ${good?'good':''}" role="status" aria-live="polite">${message}</p>`;
}
function say(message, good=false) {
  const el=dialog.querySelector('#feedback');
  if (el) { el.textContent=message; el.classList.toggle('good',good); }
}
function drawModal() {
  const focused=dialog.contains(document.activeElement)?document.activeElement:null;
  const focusAttrs=focused?['data-action','data-index','data-group','data-value','data-pick','data-drop','data-kind'].filter(a=>focused.hasAttribute(a)).map(a=>`[${a}="${CSS.escape(focused.getAttribute(a))}"]`).join(''):'';
  let html='';
  if (currentView==='intro') html=shell('歡迎，新店長！','HELLO, LITTLE MANAGER',`<p class="dialog-lead">一起用資訊技能，把小店變聰明！</p><form id="intro-form"><label class="field-label" for="shop-name">先為小店取個名字 <small>最多 12 個字</small></label><input id="shop-name" name="name" maxlength="24" value="${esc(state.name)}" autocomplete="off" required><fieldset class="avatar-picker"><legend>選一位店長</legend>${['mint','peach'].map((a,i)=>`<label class="avatar-option"><input type="radio" name="avatar" value="${a}" ${state.avatar===a?'checked':''}><span class="avatar-portrait ${a}">${avatarSvg(a)}</span><strong>${i===0?'薄荷店長':'蜜桃店長'}</strong></label>`).join('')}</fieldset>${feedback()}<button class="primary full-width" type="submit">${icon('shop')}準備好，開店囉！</button><p class="small-note">進度儲存在這個瀏覽器，不需要帳號。</p></form>`);
  else if(currentView==='tasks') html=shell('小店的升級任務','THREE LITTLE SUPERPOWERS',`<p class="dialog-lead">不急，跟著自己的步調，讓設備一個一個到齊。</p><div class="task-cards">${names.map((n,i)=>`<button class="task-card" data-action="task" data-index="${i}" ${i>0&&!state.completed[i-1]?'disabled':''}><span class="task-art">${icon(['tasks','cup','chart'][i])}</span><span><small>MISSION 0${i+1} · ${skills[i]}</small><strong>${n}</strong><span>${descriptions[i]}</span><em>${state.completed[i]?'已完成 · 再玩一次':i>0&&!state.completed[i-1]?'先完成前一項任務':'首次完成 +2 顆裝飾星星'}</em></span><b>↗</b></button>`).join('')}</div>${btn('festival',`${icon('award')}校慶開幕日${count()<3?' · 尚未解鎖':''}`,'secondary full-width', count()<3?'disabled':'')}`);
  else if(currentView==='orders') html=ordersHTML();
  else if(currentView==='rules') html=rulesHTML();
  else if(currentView==='analysis') html=analysisHTML();
  else if(currentView==='festival') html=festivalHTML();
  else if(currentView==='success') html=successHTML();
  else if(currentView==='decor') html=decorHTML();
  else if(currentView==='results') html=resultsHTML();
  else if(currentView==='order-info') html=shell('電子訂單機','MY SMART EQUIPMENT',`<p class="dialog-lead">每筆資料各就各位。A101 只保留一筆，三張訂單都很清楚！</p>${orderRows(TRAINING_ORDERS.filter((_,i)=>i!==2), false)}<div class="info-panel"><strong>資料整理</strong><p>${descriptions[0]}</p></div>${btn('task','重玩訂單整理員','secondary','data-index="0"')}`);
  else if(currentView==='rules-info') html=shell('助手工作站','MY SMART EQUIPMENT',`<p class="dialog-lead">助手記得你的出餐規則，現在會自己分辨冷熱飲！</p><div class="rule-summary"><span>冷飲 → ${cupLabel(state.rules.cold)}</span><span>熱飲 → ${cupLabel(state.rules.hot)}</span></div><div class="robot-demo">${icon('cup')}<span>收到訂單，依條件出餐。</span></div>${btn('task','重玩自動服務工程師','secondary','data-index="1"')}`);
  dialog.innerHTML=html;
  if(dialog.open&&focusAttrs) {
    const replacement=dialog.querySelector(focusAttrs);
    const next=replacement&&!replacement.disabled?replacement:dialog.querySelector('button:not(.close-modal):not(:disabled)');
    next?.focus({preventScroll:true});
  }
}
function orderRows(orders, removable, festival=false) {
  return `<div class="order-list">${orders.map((o,i)=>`<${removable?'button':'div'} ${removable?`type="button" data-action="${festival?'festival-remove':'remove-order'}" data-index="${i}"`:''} class="order-row"><span class="order-id">${esc(o.id)}</span><span>${esc(o.customer)}</span><span>${esc(o.product)}<small>${festival?`${o.type==='cold'?'冷飲':'熱飲'} · ${o.price} 元 / 杯`:''}</small></span><span>× ${o.quantity}</span>${removable?'<span class="remove-label">移除</span>':''}</${removable?'button':'div'}>`).join('')}</div>`;
}
const cards = [ ['id','A101'],['customer','小晴'],['product','奶茶'],['quantity','2'] ];
const fields = [['id','訂單編號'],['customer','顧客'],['product','商品'],['quantity','數量']];
function ordersHTML() {
  const step=viewData.step||'fields';
  if (step==='dedup') return shell('找出重複的訂單','MISSION 01 · 步驟 B / B',`<p class="dialog-lead">訂單編號是每筆訂單的識別碼，點選並移除重複匯入的那一筆 A101。</p><p class="hint-line">保留其中一筆 A101，其他不同編號的訂單都要留下。</p>${orderRows(viewData.orders,true)}${feedback()}<div class="dialog-bottom">${btn('dedup-check','確認整理完成','primary')}<span class="small-note">有效訂單應該有 3 筆</span></div>`);
  const assigned=viewData.assigned||{};
  return shell('訂單整理員','MISSION 01 · 步驟 A / B',`<p class="dialog-lead">訂單混在一起了！幫我整理好，才不會送錯餐。</p><div class="customer-bubble"><span class="customer-dot"></span>「我是小晴，想買 2 杯奶茶！」</div><p class="hint-line">拖曳資料卡到欄位，或先點卡片、再點欄位。</p><div class="data-cards">${cards.map(([key,value])=>`<button class="data-card" data-pick="${key}" data-kind="order" ${Object.values(assigned).includes(key)?'disabled':''}>${value}</button>`).join('')}</div><div class="field-grid">${fields.map(([key,label])=>`<button class="field-slot" data-drop="${key}" data-kind="order"><small>${label}</small><strong>${assigned[key]?cards.find(c=>c[0]===assigned[key])[1]:'放在這裡'}</strong></button>`).join('')}</div>${feedback()}${btn('fields-check','建立這筆訂單','primary full-width')}`);
}
function cupLabel(cup) {return cup==='cold'?'冷飲杯':cup==='hot'?'熱飲杯':'尚未設定';}
function rulesHTML() {
  return shell('自動服務工程師','MISSION 02 · 設定 → 試跑 → 修正',`<p class="dialog-lead">助手常常拿錯杯子，幫它設定出餐規則！杯子卡可以重複使用。</p><div class="cup-cards">${['cold','hot'].map(c=>`<button class="cup-card ${c}" data-pick="${c}" data-kind="rule">${icon('cup')}<strong>${cupLabel(c)}</strong><small>${c==='cold'?'適合冰涼飲料':'適合溫熱飲料'}</small></button>`).join('')}</div><p class="hint-line">拖曳或先點杯子卡，再點分支。兩邊也可以放同一種杯子。</p><div class="rule-flow"><div class="flow-node">讀取訂單</div><span class="flow-arrow">↓</span><div class="condition-node">如果飲料是「冷飲」</div><div class="branches"><div class="branch" data-branch="cold"><span>是 · 冷飲</span><button class="rule-slot" data-drop="cold" data-kind="rule">${icon('cup')}<strong>${cupLabel(state.rules.cold)}</strong></button></div><div class="branch" data-branch="hot"><span>否則 · 熱飲</span><button class="rule-slot" data-drop="hot" data-kind="rule">${icon('cup')}<strong>${cupLabel(state.rules.hot)}</strong></button></div></div><span class="flow-arrow">↓</span><div class="flow-node">送出飲料</div></div><div id="run-results" class="run-results" aria-live="polite"><p>測試訂單：冰奶茶、熱可可、冰果汁</p></div>${feedback()}${btn('run-rules',`${icon('play')}試跑這套規則`,'primary full-width')}`);
}
function salesTable(calculated) {
  const summary=summarizeOrders(SALES);
  return `<div class="table-scroll"><table class="sales-table"><caption>銷售試算表</caption><thead><tr><th scope="col">A · 商品</th><th scope="col">B · 單價</th><th scope="col">C · 銷量</th><th scope="col">D · 營收</th></tr></thead><tbody>${SALES.map((o,i)=>`<tr><th scope="row"><small>${i+2}</small>${esc(o.name)}</th><td>${o.price} 元</td><td>${o.quantity} ${o.id==='cookie'?'份':'杯'}</td><td class="revenue">${calculated?`${o.price*o.quantity} 元`:'待計算'}</td></tr>`).join('')}</tbody>${calculated?`<tfoot><tr><th colspan="3" scope="row">總營收</th><td>${summary.total} 元</td></tr></tfoot>`:''}</table></div>`;
}
function chartHTML(metric='quantity') {
  const values=SALES.map(o=>metric==='quantity'?o.quantity:o.price*o.quantity);
  return `<div class="chart-tabs" role="group" aria-label="選擇圖表指標">${btn('chart-quantity','銷量',metric==='quantity'?'tab active':'tab')}${btn('chart-revenue','營收',metric==='revenue'?'tab active':'tab')}</div><div class="bar-chart" aria-label="${metric==='quantity'?'商品銷量長條圖':'商品營收長條圖'}">${SALES.map((o,i)=>`<div class="bar-row"><strong>${esc(o.name)}</strong><div class="bar-track"><div class="bar bar-${i}" style="width:${values[i]/Math.max(...values)*100}%"></div></div><span>${values[i]} ${metric==='quantity'?'件':'元'}</span></div>`).join('')}</div>`;
}
function analysisHTML() {
  if(viewData.step==='chart' || viewData.step==='info') {
    const info=viewData.step==='info';
    const question=viewData.question||0;
    return shell(info?'小店分析看板':'讀圖，做個好決定',info?'MY SMART EQUIPMENT':'MISSION 03 · 步驟 B / B',`${salesTable(true)}${chartHTML(viewData.metric||'quantity')}${info?`<div class="info-panel"><strong>人氣王是餅乾，營收王是奶茶。</strong><p>賣最多，不一定營收最高！這裡的營收尚未扣除成本，不等於利潤。</p></div>${btn('task','重玩銷售分析師','secondary','data-index="2"')}`:`<div class="question-box"><small>決策 ${question+1} / 2</small><h3>${question===0?'明天要替賣出數量最多的商品多準備一些，請選擇商品。':'今天哪個商品帶來最高營收？'}</h3><div class="answer-buttons">${SALES.map(o=>btn('answer',esc(o.name),'secondary',`data-product="${o.id}"`)).join('')}</div></div>${feedback()}`}`);
  }
  const formula=viewData.formula||[];
  return shell('銷售分析師','MISSION 03 · 步驟 A / B',`<p class="dialog-lead">今天哪個商品最受歡迎？用表格幫小店找答案！</p>${salesTable(!!viewData.calculated)}<p class="hint-line">依序點選公式積木，或拖到空格裡。先算一筆，再套用整欄。</p><div class="formula-cards">${['單價','×','銷量'].map((v,i)=>`<button class="data-card" data-pick="${i}" data-kind="formula" ${formula.includes(v)?'disabled':''}>${v}</button>`).join('')}</div><div class="formula-line"><strong>營收 ＝</strong>${[0,1,2].map(i=>`<button class="formula-slot" data-drop="${i}" data-kind="formula" aria-label="公式第 ${i+1} 格">${esc(formula[i]||'？')}</button>`).join('')}${btn('formula-reset','重排','text-button')}</div><div class="cell-formula">D2 <code>${formula.join('|')==='單價|×|銷量'?'=B2*C2':'先組合上方公式'}</code></div>${feedback()}${viewData.calculated?btn('analysis-chart','看看銷售圖表 →','primary full-width'):btn('formula-apply','套用整欄','primary full-width')}`);
}
function festivalHTML() {
  const step=viewData.step||'dedup';
  return shell('校慶開幕日','FINAL CHALLENGE · 把三種技能用在一起',`<p class="dialog-lead">校慶客人來了！先檢查重複訂單，再讓助手出餐，最後結算營收。</p><div class="festival-steps"><span class="${step==='dedup'?'active':''}">1 整理訂單</span><span class="${step==='serve'?'active':''}">2 自動出餐</span><span class="${step==='calculate'?'active':''}">3 營收結算</span></div>${orderRows(viewData.orders,step==='dedup',true)}<div id="run-results" class="run-results" aria-live="polite"></div>${feedback()}${step==='dedup'?btn('festival-dedup','確認有效訂單','primary full-width'):step==='serve'?`<p class="hint-line">沿用已儲存的規則：冷飲 → ${cupLabel(state.rules.cold)}，熱飲 → ${cupLabel(state.rules.hot)}。</p>${btn('festival-serve',`${icon('play')}開始出餐`,'primary full-width')}`:btn('festival-calculate','計算今日營收','primary full-width')}`);
}
function successHTML() {
  if(viewData.final) {
    const s=viewData.summary;
    return shell('智慧小店開幕成功！','GRAND OPENING · Lv.4 校園明星店',`<div class="celebration" aria-hidden="true"><span>✦</span>${icon('award')}<span>✦</span></div><div class="final-numbers"><div><strong>${s.orderCount}</strong><span>筆有效訂單</span></div><div><strong>${s.cupCount}</strong><span>杯飲料</span></div><div><strong>${s.total}</strong><span>元總營收</span></div></div><div class="receipt">${s.lines.map(o=>`<p><span>${esc(o.product)} ${o.price} × ${o.quantity}</span><strong>${o.revenue} 元</strong></p>`).join('')}<p><span>重複訂單已排除</span><strong>合計 ${s.total} 元</strong></p></div><div class="badge-unlocked">${icon('award')}<span><strong>資處小店長</strong><small>遊戲紀念徽章 · 紀念你的第一間智慧小店</small></span></div><p class="ending">原來資處科，能用資料與程式讓生活更方便！</p><div class="two-buttons">${btn('decor','繼續裝飾','primary')}${btn('results','查看我的成果','secondary')}</div><div class="two-buttons">${btn('tasks','重玩任務','text-button')}${btn('home','返回資處科首頁','text-button')}</div>`);
  }
  const i=viewData.index;
  const titles=['原來這就是資料整理！','你讓助手學會條件判斷！','賣最多，不一定營收最高！'];
  const texts=['把資料放進正確欄位，再用編號識別每筆紀錄。','程式會依照條件，執行不同動作。','試算表能幫你計算，圖表能幫你看出差異。'];
  const upgrades=['電子訂單機已加入店面','助手工作站已加入店面','分析看板與餅乾展示櫃已加入店面'];
  return shell(titles[i],`MISSION 0${i+1} COMPLETE`, `<div class="success-seal">${icon('check')}</div><p class="dialog-lead centered">${texts[i]}</p><div class="upgrade-reward">${icon(['tasks','cup','chart'][i])}<strong>${upgrades[i]}</strong><span>${viewData.firstReward?'+2 顆裝飾星星':'重玩完成 · 首次獎勵已領取'}</span></div>${btn('close','看看升級後的小店','primary full-width')}${btn(i<2?'next-task':'festival',i<2?'繼續下一個任務 →':'挑戰校慶開幕日 →','text-button full-width',`data-index="${i+1}"`)}`);
}
const decorGroups={sign:{name:'招牌',options:[['mint','薄荷綠'],['pink','柔和粉']]},chair:{name:'椅子',options:[['cat','貓咪'],['bear','熊熊']]},plant:{name:'盆栽',options:[['flower','小花'],['cactus','仙人掌']]}};
function decorHTML() {
  return shell('佈置你的小小夢想','MAKE IT YOURS',`<div class="decor-balance">${icon('star')}<strong>${state.stars} 顆裝飾星星</strong><span>每組解鎖 2 顆，組內免費切換</span></div><div class="decor-preview">${renderScene(state,{preview:preview||{},interactive:false})}<span class="preview-label">${preview?'預覽中 · 尚未套用':'目前店面'}</span></div><div class="decor-groups">${Object.entries(decorGroups).map(([key,g])=>`<section class="decor-group"><div><h3>${g.name}</h3><small>${state.unlocked[key]?'已解鎖 · 免費切換':'2 顆星星解鎖整組'}</small></div><div class="decor-options">${g.options.map(([value,label])=>btn('decor-preview',label,(preview?.[key]||state.decor[key])===value?'decor-option selected':'decor-option',`data-group="${key}" data-value="${value}"`)).join('')}</div>${btn('decor-apply',state.unlocked[key]?'套用造型':'解鎖並套用','secondary',`data-group="${key}"`)}</section>`).join('')}</div>${feedback()}<p class="small-note">先點造型預覽，再套用。設備自動升級，不消耗星星。</p>` , true);
}
function resultsHTML() {
  const choices=Object.entries(decorGroups).map(([g,data])=>`${data.name}：${data.options.find(o=>o[0]===state.decor[g])?.[1]||''}${state.unlocked[g]?'':'（預設）'}`).join(' · ');
  return shell('我的店長成果','LITTLE STEPS, BIG IDEAS',`<div class="results-identity"><span class="avatar-mini ${state.avatar}">${avatarSvg(state.avatar)}</span><div><h3>${esc(state.name)}</h3><p>Lv.${level()} ${state.finalComplete?'校園明星店':'成長中的小店'} · ${state.avatar==='mint'?'薄荷店長':'蜜桃店長'}</p></div>${btn('rename','編輯','text-button')}</div><div class="skill-results">${skills.map((s,i)=>`<div class="skill-result ${state.completed[i]?'done':''}"><span>${icon(state.completed[i]?'check':['tasks','cup','chart'][i])}</span><div><strong>${s}<small>${state.completed[i]?'已完成':'等待探索'}</small></strong><p>${descriptions[i]}</p></div></div>`).join('')}</div><div class="info-panel"><strong>我的佈置</strong><p>${choices}</p></div><div class="badge-unlocked ${state.finalComplete?'':'locked'}">${icon('award')}<span><strong>${state.finalComplete?'資處小店長':'尚未取得紀念徽章'}</strong><small>${state.finalComplete?'遊戲完成紀念，不代表正式證照':'完成校慶開幕日後解鎖'}</small></span></div><p class="ending">原來資處科，能用資料與程式讓生活更方便！</p><div class="two-buttons">${btn('decor','繼續裝飾','primary')}${btn('tasks','重玩任務','secondary')}</div>${btn('home','返回資處科首頁','text-button full-width')}`);
}
function startTask(i) {
  if(i<0||i>2||i>0&&!state.completed[i-1]) return;
  openModal(['orders','rules','analysis'][i],i===0?{step:'fields',assigned:{}}:i===2?{step:'formula',formula:[]}:{});
}
function complete(i) {
  const reward=completeTask(state,i);
  persist(); render();
  openModal('success',{index:i,firstReward:reward.firstReward});
}
function startFestival() {
  if(count()<3) return;
  openModal('festival',{step:'dedup',orders:FESTIVAL_ORDERS.map(o=>({...o}))});
}
function selectCard(key,kind,element) {
  if(running) return;
  selected={key,kind};
  dialog.querySelectorAll('[data-pick]').forEach(e=>{const yes=e===element;e.classList.toggle('selected',yes);e.setAttribute('aria-pressed',String(yes));});
  if(kind==='formula') {
    const next=(viewData.formula||[]).findIndex(x=>!x);
    const index=next<0?(viewData.formula||[]).length:next;
    placeCard(String(index),kind);
  }
}
function placeCard(target,kind) {
  if(running) return;
  if(!selected || selected.kind!==kind) {say('先點選一張資料卡，再點選要放入的位置。');return;}
  if(kind==='order') {
    if(selected.key!==target) {
      const hints={id:'「A101」是識別這筆紀錄的編號，應該放在訂單編號欄。',customer:'「小晴」是購買商品的人，應該放在顧客欄。',product:'「奶茶」是購買的東西，應該放在商品欄。',quantity:'「2」表示買幾杯，應該放在數量欄。'};
      say(hints[selected.key]);return;
    }
    viewData.assigned[target]=selected.key;
    selected=null;drawModal();say('放對了！每個欄位都有自己的用途。',true);
  } else if(kind==='rule') {
    state.rules[target]=selected.key;persist();selected=null;drawModal();say('規則已更新。按「試跑」看看助手會怎麼做。',true);
  } else if(kind==='formula') {
    const i=Number(target),value=['單價','×','銷量'][Number(selected.key)];
    if(i>2||viewData.formula.includes(value)) return;
    viewData.formula[i]=value;viewData.calculated=false;selected=null;drawModal();
  }
}
function wait(ms,token) {return new Promise(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve(token===runToken);},ms);timers.set(id,resolve);});}
async function animateService(orders,festival) {
  if(running) return;
  if(!state.rules.cold||!state.rules.hot) {say('兩個分支都要放入杯子，才能開始試跑。');return;}
  running=true;
  const token=++runToken;
  const results=runRules(orders,state.rules);
  dialog.querySelectorAll('button:not(.close-modal)').forEach(b=>b.disabled=true);
  document.querySelector('.scene-region')?.classList.add('is-serving');
  const output=dialog.querySelector('#run-results');
  output.innerHTML='<div class="service-stage"><div class="service-assistant"></div><div class="service-speech">助手準備好了！</div></div><p class="run-status">助手開始讀取訂單…</p>';
  output.querySelector('.service-assistant').innerHTML=robotSvg(null);
  for(const [i,r] of results.entries()) {
    if(!await wait(matchMedia('(prefers-reduced-motion: reduce)').matches?180:680,token))return;
    dialog.querySelectorAll('[data-branch]').forEach(e=>e.classList.toggle('active-branch',e.dataset.branch===r.type));
    output.querySelector('.service-assistant').innerHTML=robotSvg(r.cup);
    output.querySelector('.service-speech').textContent=`${r.type==='cold'?'走冷飲分支':'走熱飲分支'}，拿出${cupLabel(r.cup)}！`;
    const status=output.querySelector('.run-status');
    status.textContent=`讀取第 ${i+1} 筆：${r.product} → ${r.type==='cold'?'冷飲分支':'熱飲分支'}`;
    const row=document.createElement('p');row.className=`test-result ${r.correct?'pass':'fail'}`;
    row.innerHTML=`${icon(r.correct?'check':'close')}<span><strong>${esc(r.product)}</strong> → ${cupLabel(r.cup)}<small>${r.correct?'顧客：「杯子剛剛好，謝謝店長！」':`顧客：「這是${r.type==='cold'?'冷飲，需要冷飲杯':'熱飲，需要熱飲杯'}喔！」`}</small></span>`;
    output.append(row);
  }
  if(!await wait(300,token))return;
  running=false;
  document.querySelector('.scene-region')?.classList.remove('is-serving');
  const score=results.filter(r=>r.correct).length;
  output.querySelector('.run-status').textContent=`測試完成 · 正確 ${score} / ${results.length}`;
  dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
  if(score!==results.length) {
    say('有訂單用錯杯子：冷飲應使用冷飲杯，熱飲應使用熱飲杯。保留你的設定，修改後再試一次。');
    if(festival) {viewData.step='serve';output.insertAdjacentHTML('beforeend',btn('festival-fix','修改助手規則','secondary'));}
    return;
  }
  if(festival) {
    viewData.step='calculate';
    dialog.querySelector('[data-action="festival-serve"]').outerHTML=btn('festival-calculate','計算今日營收','primary full-width');
    dialog.querySelector('[data-action="festival-calculate"]').focus({preventScroll:true});
    say('3 筆訂單都用對杯子！現在算算今日營收。',true);
  } else {
    say('三筆訂單全部正確，助手準備好上班了！',true);
    const runButton=dialog.querySelector('[data-action="run-rules"]');
    runButton.outerHTML=btn('rules-complete','完成任務，升級工作站','primary full-width');
    dialog.querySelector('[data-action="rules-complete"]').focus({preventScroll:true});
  }
}

async function action(button) {
  const a=button.dataset.action;
  if(running && a!=='close')return;
  const index=Number(button.dataset.index);
  if(a==='enter') {
    if(location.hash!=='#shop')location.hash='shop';
    else if(!state.started)openModal('intro');
  } else if(a==='close')closeModal();
  else if(a==='home'){
    closeModal();
    if(location.hash!=='#home')location.hash='home';
    else {render();document.querySelector('.hero-cta')?.focus();}
  }
  else if(a==='tasks')openModal('tasks');
  else if(a==='task'||a==='next-task')startTask(index);
  else if(a==='rename')openModal('intro');
  else if(a==='decor'){preview=null;openModal('decor');}
  else if(a==='results')openModal('results');
  else if(a==='festival')startFestival();
  else if(a==='fields-check') {
    if(Object.keys(viewData.assigned).length!==4) {say('還有欄位空著，四張資料卡都要放到正確的位置。');return;}
    viewData={step:'dedup',orders:TRAINING_ORDERS.map(o=>({...o}))};selected=null;drawModal();
  } else if(a==='remove-order'||a==='festival-remove') {
    const next=removeDuplicate(viewData.orders,index);
    if(!next) {
      say(viewData.orders[index]?.id==='A103'?'同一位顧客可以再次購買，訂單編號不同，就不是這次的重複資料。':'這筆編號只有一筆，要保留它，請找出編號相同的重複訂單。');return;
    }
    viewData.orders=next;drawModal();say('重複的那一筆已移除，另一筆完整保留。',true);
  } else if(a==='dedup-check') {
    if(viewData.orders.length!==3){say('還有一筆重複的 A101，選其中一筆移除即可。');return;}
    complete(0);
  } else if(a==='run-rules')await animateService(SERVICE_ORDERS,false);
  else if(a==='rules-complete') {
    if(runRules(SERVICE_ORDERS,state.rules).every(r=>r.correct))complete(1);
  } else if(a==='formula-reset'){viewData.formula=[];viewData.calculated=false;drawModal();}
  else if(a==='formula-apply') {
    if(viewData.formula.join('|')!=='單價|×|銷量'){say('營收要用「單價 × 銷量」。按「重排」後再依序放入積木試試看。');return;}
    viewData.calculated=true;drawModal();say('已用相同公式計算整欄：240、200、140，總營收 580 元！',true);
  } else if(a==='analysis-chart') {viewData={step:'chart',metric:'quantity',question:0};drawModal();}
  else if(a==='chart-quantity'||a==='chart-revenue'){viewData.metric=a==='chart-quantity'?'quantity':'revenue';drawModal();}
  else if(a==='answer') {
    const expected=SALES.find(o=>viewData.question===0?o.quantity===8:o.price*o.quantity===240)?.id;
    if(button.dataset.product!==expected){say(viewData.question===0?'看「銷量」圖：餅乾賣出 8 份，比奶茶 6 杯、果汁 4 杯多。再選一次吧！':'看「營收」圖：奶茶 240 元，比餅乾 200 元、果汁 140 元高。再選一次吧！');return;}
    if(viewData.question===0){viewData.question=1;viewData.metric='revenue';drawModal();say('對！餅乾賣得最多。接著看看哪項商品營收最高。',true);}else complete(2);
  } else if(a==='festival-dedup') {
    if(viewData.orders.length!==3){say('先移除一筆重複 F201，重複資料不能計入營收。');return;}
    viewData.step='serve';drawModal();say('整理完成！3 筆有效訂單，接著開始出餐。',true);
  } else if(a==='festival-serve')await animateService(viewData.orders,true);
  else if(a==='festival-fix')openModal('rules');
  else if(a==='festival-calculate') {
    const orders=viewData.orders;
    if(!finishFestival(state,orders)){say('請確認三筆有效訂單與冷熱杯規則都正確，再完成出餐。');return;}
    persist();render();openModal('success',{final:true,summary:summarizeOrders(orders)});
    await processCampusReward(state,persist);
  } else if(a==='decor-preview') {
    preview={...(preview||{}),[button.dataset.group]:button.dataset.value};drawModal();say('這是預覽效果；點「解鎖並套用」或「套用造型」才會儲存。');
  } else if(a==='decor-apply') {
    const group=button.dataset.group;
    const result=purchaseDecoration(state,group);
    if(!result.ok){say(result.message);return;}
    if(preview?.[group])state.decor[group]=preview[group];
    if(preview)delete preview[group];
    if(preview&&!Object.keys(preview).length)preview=null;
    persist();render();drawModal();say('造型已套用！已解鎖的整組造型隨時可以免費切換。',true);
  }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button || button.disabled)return;
  if(button.dataset.pick!==undefined)selectCard(button.dataset.pick,button.dataset.kind,button);
  else if(button.dataset.drop!==undefined)placeCard(button.dataset.drop,button.dataset.kind);
  else if(button.dataset.station) {
    if(location.hash!=='#shop'||dialog.open)return;
    const stations={orders:0,rules:1,analysis:2};const i=stations[button.dataset.station];
    if(state.completed[i]) {
      if(i===2)openModal('analysis',{step:'info',metric:'quantity'});
      else openModal(i===0?'order-info':'rules-info');
    } else if(i>0&&!state.completed[i-1])toast('先完成前一項任務，這台設備就能開始升級。');
    else startTask(i);
  } else if(button.dataset.action)void action(button);
});
dialog.addEventListener('submit',event=>{
  if(event.target.id!=='intro-form')return;
  event.preventDefault();
  const data=new FormData(event.target);
  const name=String(data.get('name')||'').trim();
  if(!name || Array.from(name).length>12) {say('請輸入 1～12 個字的店名，才放得進小店招牌喔。');return;}
  state.name=name;state.avatar=data.get('avatar')==='peach'?'peach':'mint';state.started=true;
  persist();render();closeModal();toast('歡迎新店長！點選訂單區，開始第一個任務。');
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length>0);
  const first=focusable[0],last=focusable.at(-1);
  if(!first){event.preventDefault();return;}
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});

// Pointer dragging is scoped to cards only. Tap-then-place always remains available.
dialog.addEventListener('pointerdown',event=>{
  const card=event.target.closest('[data-pick]');
  if(!card||card.disabled||running||event.button!==0)return;
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,card,key:card.dataset.pick,kind:card.dataset.kind,moved:false,ghost:null};
  card.setPointerCapture(event.pointerId);
});
dialog.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>9){
    drag.moved=true;selected={key:drag.key,kind:drag.kind};
    drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=drag.card.textContent;dialog.append(drag.ghost);
  }
  if(drag.ghost){drag.ghost.style.left=`${event.clientX+12}px`;drag.ghost.style.top=`${event.clientY+8}px`;}
});
dialog.addEventListener('pointerup',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const d=drag;drag=null;d.ghost?.remove();
  if(d.moved){
    const slot=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop]');
    if(slot&&slot.dataset.kind===d.kind)placeCard(slot.dataset.drop,d.kind);
    else say('把卡片放到目標欄位，或先點卡片、再點欄位。');
    const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
    document.addEventListener('click',stop,{capture:true,once:true});
    setTimeout(()=>document.removeEventListener('click',stop,true),0);
  }
});
dialog.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;});
window.addEventListener('hashchange',()=>{
  if(dialog.open)closeModal();
  render();
  if(location.hash==='#shop'&&!state.started)openModal('intro');
  else document.querySelector(location.hash==='#shop'?'.back-link':'.hero-cta')?.focus();
});
window.addEventListener('pagehide',()=>{cancelRun();clearTimeout(toastTimer);});
render();
if(loaded.warning)toast(loaded.warning);
if(location.hash==='#shop'&&!state.started)openModal('intro');

if(state.finalComplete)void processCampusReward(state,persist);
