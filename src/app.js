import { robotSvg } from './scene.js?v=f5be6a185bcc';
import { renderAdventure, adventurerSvg as avatarSvg } from './adventure-world.js?v=f5be6a185bcc';
import { QUESTS, BOSS, CAMP, TILE, canEnter, experience, heroLevel, findPath, passable, nearestNPC, loadRpg, saveRpg } from './rpg.js?v=f5be6a185bcc';
import { loadState, saveState, completeTask, purchaseDecoration, removeDuplicate, runRules, summarizeOrders, finishFestival, SALES, TRAINING_ORDERS, SERVICE_ORDERS, FESTIVAL_ORDERS } from './game.js?v=f5be6a185bcc';
import { processCampusReward } from './integration.js?v=f5be6a185bcc';

const loaded = loadState();
const state = loaded.state;
const rpgLoaded=loadRpg();
const rpg=rpgLoaded.rpg;
const renderScene=(state,options={})=>renderAdventure(state,rpg,options);
const app = document.querySelector('#app');
const dialog = document.querySelector('#game-dialog');
const toastElement = document.querySelector('#toast');
let persistent = loaded.persistent && rpgLoaded.persistent;
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
let walkToken=0;
let walking=false;
let walkTimer=null;
let walkResolve=null;
const names = QUESTS.map(q=>q.name);
const skills = QUESTS.map(q=>q.course);
const descriptions = ['把資料分類、建立欄位，找出重複紀錄。', '設定條件，讓電腦依規則完成工作。', '利用公式與圖表，從數字中找到答案。'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => {
  const paths = {shop:'M3 10h18M5 10v11h14V10M3 10l3-7h12l3 7M9 21v-7h6v7M9 3l-1 7m7-7 1 7',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',arrow:'m10 6-6 6 6 6M4 12h16',tasks:'M9 5h11M9 12h11M9 19h11M3 5l1 1 2-3M3 12l1 1 2-3M3 19l1 1 2-3',decor:'m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm7 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z',award:'M8 3h8l2 4-2 7H8L6 7Zm1 11-2 8 5-3 5 3-2-8M10 7h4',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',play:'m8 4 12 8-12 8Z',leaf:'M20 3C7 1 2 8 7 15c7 5 14 0 13-12ZM4 21 16 8',chart:'M4 3v18h17M8 17v-5m5 5V7m5 10V4',cup:'M5 7h12v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3ZM17 8h2a3 3 0 0 1 0 6h-2M8 3v1m5-1v1',info:'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.shop}"/></svg>`;
};
const btn = (action, label, cls = 'primary', attrs = '') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const level = () => heroLevel(state);
const count = () => state.completed.filter(Boolean).length;

function toast(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 4400);
}
function persist() {
  if (!saveState(state) || !saveRpg(rpg)) {
    if (persistent) toast('目前瀏覽器無法保存進度，你仍可繼續遊玩。離開頁面後可能遺失本次進度。');
    persistent = false;
  }
}
function render() {
  const home = location.hash !== '#shop';
  app.innerHTML = `<header class="topbar"><a class="brand" href="#home" aria-label="資處萌萌冒險首頁"><span class="brand-icon">${icon('shop')}</span><span>資處萌萌冒險<small>DATA QUEST RPG</small></span></a><span class="header-note">闖過三關，認識資處科</span><span class="edition">資料迷霧之島</span></header>
    ${!persistent ? '<div class="storage-banner" role="status">本次進度無法保存；遊戲仍可正常操作，請勿關閉或重新整理頁面。</div>' : ''}
    ${home ? homeHTML() : shopHTML()}
    <footer class="site-footer"><span>把關卡做過的事，連回資處科的學習。</span><span>資料處理科 · 課程探索 RPG</span></footer>`;
}
function homeHTML() {
  return `<main class="rpg-cover"><div class="rpg-cover-copy"><span class="rpg-eyebrow">DATA QUEST · 資處科課程探索 RPG</span><h1>資處萌萌冒險<span>資料迷霧之島</span></h1><p class="cover-story">校慶系統被雜訊打亂了。<br>帶著你的助手，找回三枚知識符文！</p>${btn('enter',`${icon('play')}${state.started?'繼續冒險':'開始冒險'}`,'primary hero-cta')}<div class="cover-runes">${QUESTS.map((q,i)=>`<span>${icon(['tasks','cup','chart'][i])}${q.course}</span>`).join('')}</div><p class="rpg-cover-note">探索地圖 · NPC 任務 · 實作解謎 · 課程圖鑑<br>沒有倒數，不用刷怪，進度自動保存。</p><a class="direct-entry" href="#shop">直接進入冒險地圖 →</a></div><div class="rpg-cover-map">${renderScene(state,{interactive:false})}<span class="cover-map-label">三座學習據點，一場校慶救援。</span></div></main>`;
}
function shopHTML() {
  const next=state.completed.findIndex(x=>!x);
  const xp=experience(state);
  return `<main class="shop-layout adventure-layout"><div class="rpg-playerbar"><a class="back-link" href="#home">${icon('arrow')}返回首頁</a><span class="manager-token">${avatarSvg(state.avatar)}</span><div class="store-identity"><span class="rpg-eyebrow">INFORMATION APPRENTICE</span><h1>${esc(state.name)}<span class="level-badge">Lv.${level()} ${state.finalComplete?'資料勇者':'資訊見習生'}</span></h1><div class="xp-track" aria-label="經驗值 ${xp}"><i style="width:${xp/125*100}%"></i></div><small>${xp} XP · 闖關提升冒險等級</small></div><div class="stats"><span class="star-pill">${icon('star')}<strong>${state.stars}</strong><small>探險星</small></span><span class="progress-pill"><strong>${count()} / 3</strong><small>知識符文</small></span></div></div><div class="rpg-world-heading"><div><span class="rpg-eyebrow">CHAPTER 01</span><h2>資料迷霧之島</h2></div><span class="chapter-status">${state.finalComplete?'校慶系統已修復':count()===3?'雜訊核心的封印解除了！':'跟著石板路，尋找知識的守護者。'}</span></div><section class="adventure-panel" aria-label="冒險地圖"><div class="scene-region">${renderScene(state)}</div><div class="rpg-world-caption"><span>${icon('leaf')}${state.finalComplete?'資料迷霧解除！可以回訪 NPC，練習你的技能。':next>=0?`目前任務：${QUESTS[next].name} · ${QUESTS[next].course}`:'前往雜訊核心，綜合運用三種技能。'}</span><span>點選據點自動沿路走 · 也能用方向鍵</span></div></section><div class="world-controls"><div class="dpad" aria-label="角色移動">${btn('move','↑','dpad-up','data-dx="0" data-dy="-1" aria-label="向上移動"')}${btn('move','←','dpad-left','data-dx="-1" data-dy="0" aria-label="向左移動"')}${btn('move','↓','dpad-down','data-dx="0" data-dy="1" aria-label="向下移動"')}${btn('move','→','dpad-right','data-dx="1" data-dy="0" aria-label="向右移動"')}</div><p class="rpg-move-hint" role="status" aria-live="polite">沿石板路探索，走近 NPC 按「對話」。</p>${btn('talk',`${icon('info')}對話 / 調查`,'secondary talk-button')}</div><ol class="journey-list rpg-quest-strip">${QUESTS.map((q,i)=>`<li class="${state.completed[i]?'done':next===i?'current':''}"><button data-action="travel" data-index="${i}"><span class="step-number">${icon(state.completed[i]?'check':['tasks','cup','chart'][i])}</span><span><strong>${q.place}</strong><small>${q.course}</small></span></button></li>`).join('')}</ol><button class="festival-entry rpg-boss-entry" data-action="travel" data-index="3">${icon('award')}<span><strong>最終任務・校慶救援</strong><small>${state.finalComplete?'已完成 · 可再次挑戰':count()<3?'收集三枚符文，解除雜訊核心封印':'封印已解除，前往綜合應用挑戰'}</small></span><span>↗</span></button><nav class="bottom-actions" aria-label="冒險選單">${btn('tasks',`${icon('tasks')}<span>任務日誌<small>尋找下一個目標</small></span>`,'nav-button')}${btn('knowledge',`${icon('chart')}<span>課程圖鑑<small>這就是資處科！</small></span>`,'nav-button')}${btn('results',`${icon('award')}<span>我的角色<small>符文與冒險紀錄</small></span>`,'nav-button')}</nav></main>`;
}
function stopWalk() {
  walkToken++;
  clearTimeout(walkTimer);
  if(walkResolve){walkResolve(false);walkResolve=null;}
  walking=false;
  document.querySelector('.rpg-hero')?.classList.remove('is-walking');
}
function updateHero() {
  const hero=document.querySelector('.scene-region .rpg-hero');
  if(hero){hero.setAttribute('transform',`translate(${rpg.hero.x*TILE+20} ${rpg.hero.y*TILE+20})`);hero.dataset.x=rpg.hero.x;hero.dataset.y=rpg.hero.y;}
  if(!saveRpg(rpg)&&persistent){persistent=false;toast('本次探索位置無法保存；你仍可繼續遊玩。');}
}
function worldMessage(message) {
  const el=document.querySelector('.rpg-move-hint');if(el)el.textContent=message;
}
function moveHero(dx,dy) {
  if(dialog.open)return;
  stopWalk();
  const next={x:rpg.hero.x+dx,y:rpg.hero.y+dy};
  if(!passable(next.x,next.y)){worldMessage('這裡是草木或建築。沿著石板路前進，點選據點也能自動帶路。');return;}
  rpg.hero=next;updateHero();
  const near=nearestNPC(next);
  worldMessage(near>=0?`${near===3?'雜訊核心':QUESTS[near].npc}就在附近，按「對話 / 調查」或 Enter。`:'沿石板路探索，走近 NPC 按「對話」。');
}
function talk() {
  const i=nearestNPC(rpg.hero);
  if(i<0){worldMessage('附近沒有守護者。點選地圖據點，角色會沿路走過去。');return;}
  openModal('npc',{index:i});
}
async function travel(index) {
  if(!Number.isInteger(index)||index<0||index>3)return;
  if(dialog.open)closeModal();
  if(!canEnter(state.completed,index)){openModal('npc',{index});return;}
  stopWalk();
  const token=walkToken,target=index===3?BOSS:QUESTS[index].pos;
  const path=findPath(rpg.hero,target);
  walking=true;document.querySelector('.rpg-hero')?.classList.add('is-walking');
  worldMessage(`正在前往${index===3?'雜訊核心':QUESTS[index].place}…`);
  for(const step of path){
    const active=await new Promise(resolve=>{walkResolve=resolve;walkTimer=setTimeout(()=>{walkResolve=null;resolve(token===walkToken);},matchMedia('(prefers-reduced-motion: reduce)').matches?25:110);});
    if(!active)return;
    rpg.hero={...step};updateHero();
  }
  walking=false;document.querySelector('.rpg-hero')?.classList.remove('is-walking');
  if(token===walkToken)openModal('npc',{index});
}
function cancelRun() {
  stopWalk();
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
function courseBanner(i) {
  const q=QUESTS[i];
  return `<div class="course-banner"><span>資處科學習連結</span><strong>${q.course}</strong><small>${q.skill}</small></div>`;
}
function npcHTML() {
  const i=viewData.index;
  if(i===3)return shell('雜訊核心・最後的封印','FINAL QUEST · 校慶系統救援',`<div class="npc-dialogue"><span class="npc-portrait">${robotSvg('cold')}</span><p>「你收集的三種技能，能讓校慶系統恢復正常嗎？」</p></div><p class="dialog-lead">${canEnter(state.completed,3)?'秩序、邏輯、洞察符文都在發光。這次沒有新的答案提示，請把資料整理、程式邏輯與營收計算用在一起！':'目前封印尚未解除。先完成三座據點的實作任務，取得三枚知識符文。'}</p><div class="rune-inventory">${QUESTS.map((q,j)=>`<span class="${state.completed[j]?'obtained':''}">${state.completed[j]?'◆':'◇'} ${q.rune}</span>`).join('')}</div>${canEnter(state.completed,3)?btn('festival','挑戰雜訊核心','primary full-width'):btn('close','回到地圖尋找符文','secondary full-width')}`);
  const q=QUESTS[i];
  return shell(q.name,`QUEST 0${i+1} · ${q.place}`,`<div class="npc-dialogue"><span class="npc-portrait">${avatarSvg(q.color)}</span><div><strong>${q.npc}</strong><p>「${q.brief}」</p></div></div>${courseBanner(i)}<p class="quest-objective"><strong>這一關你要動手做：</strong>${q.task}</p>${canEnter(state.completed,i)?btn('accept-task',state.completed[i]?'再次實作這項技能':'接受任務，動手修復','primary full-width',`data-index="${i}"`):`<p class="feedback">先取得前一座據點的知識符文，才能解除這裡的封印。</p>${btn('close','先回地圖探索','secondary full-width')}`}${state.completed[i]?btn('knowledge','查看取得的課程知識','text-button full-width'):''}`);
}
function journalHTML() {
  return shell('冒險任務日誌','QUEST LOG · 每一步都有學習目標',`<p class="dialog-lead">前往據點，跟 NPC 說話，再用實際操作取得符文。</p><div class="task-cards">${QUESTS.map((q,i)=>`<button class="task-card" data-action="travel" data-index="${i}"><span class="task-art">${icon(state.completed[i]?'check':['tasks','cup','chart'][i])}</span><span><small>QUEST 0${i+1} · ${state.completed[i]?'已取得符文':canEnter(state.completed,i)?'可探索':'尚有封印'}</small><strong>${q.name}</strong><span>${q.course}</span><em>${q.task}</em></span><b>↗</b></button>`).join('')}</div>${btn('travel',`${icon('award')}最終任務・校慶救援`,'secondary full-width','data-index="3"')}`);
}
function knowledgeHTML() {
  return shell('這就是資處科的學習！','COURSE CODEX · 從操作連回課程',`<p class="dialog-lead">你使用的每個招式，都來自資料與程式的實作。圖鑑記錄已完成的操作，不代表正式證照。</p><div class="course-codex">${QUESTS.map((q,i)=>`<article class="course-card ${state.completed[i]?'learned':'unlearned'}"><div class="course-card-top"><span>0${i+1} · ${q.rune}</span><b>${state.completed[i]?'已取得':'探索中'}</b></div><h3>${q.course}</h3>${state.completed[i]?`<dl><dt>我在關卡做了什麼？</dt><dd>${q.task}</dd><dt>這與資處科有什麼關係？</dt><dd>${q.learned}</dd><dt>生活中會用在哪裡？</dt><dd>${q.reality}</dd><dt>可以繼續挑戰</dt><dd>${q.practical}</dd></dl>`:`<p>完成「${q.name}」後，在這裡收集你的實作紀錄與生活應用。</p>${btn('travel','前往據點探索','secondary',`data-index="${i}"`)}`}</article>`).join('')}</div><p class="small-note">以上為常見學習領域的入門體驗。學校實際課程與年級安排，請以正式公告為準。</p>`);
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
  if(currentView==='intro')html=shell('歡迎，資訊見習生！','PROLOGUE · 校慶系統的求救信',`<div class="story-intro"><span>來自島上的求救信</span><p>「校慶系統被雜訊打亂了！檔案館、程式工坊與分析塔各守著一枚知識符文，請幫我們恢復系統。」</p></div><form id="intro-form"><label class="field-label" for="shop-name">你的冒險者名字 <small>1～12 個字</small></label><input id="shop-name" name="name" maxlength="24" value="${esc(state.started?state.name:'萌萌見習生')}" autocomplete="off" required><fieldset class="avatar-picker"><legend>選擇你的角色</legend>${['mint','peach'].map((a,i)=>`<label class="avatar-option"><input type="radio" name="avatar" value="${a}" ${state.avatar===a?'checked':''}><span class="avatar-portrait ${a}">${avatarSvg(a)}</span><strong>${i===0?'薄荷見習生':'蜜桃見習生'}</strong></label>`).join('')}</fieldset>${feedback()}<button class="primary full-width" type="submit">${icon('play')}帶著助手，展開冒險</button><p class="small-note">舊版已取得的進度與星星會保留，不需要重複領獎。</p></form>`);
  else if(currentView==='npc')html=npcHTML();
  else if(currentView==='tasks')html=journalHTML();
  else if(currentView==='knowledge')html=knowledgeHTML();  else if(currentView==='orders') html=ordersHTML();
  else if(currentView==='rules') html=rulesHTML();
  else if(currentView==='analysis') html=analysisHTML();
  else if(currentView==='festival') html=festivalHTML();
  else if(currentView==='success') html=successHTML();
  else if(currentView==='decor') html=decorHTML();
  else if(currentView==='results') html=resultsHTML();
  else if(currentView==='order-info') html=shell('電子訂單機','MY SMART EQUIPMENT',`<p class="dialog-lead">每筆資料各就各位。A101 只保留一筆，三張訂單都很清楚！</p>${orderRows(TRAINING_ORDERS.filter((_,i)=>i!==2), false)}<div class="info-panel"><strong>資料整理</strong><p>${descriptions[0]}</p></div>${btn('task','重玩訂單整理員','secondary','data-index="0"')}`);
  else if(currentView==='rules-info') html=shell('助手工作站','MY SMART EQUIPMENT',`<p class="dialog-lead">助手記得你的出餐規則，現在會自己分辨冷熱飲！</p><div class="rule-summary"><span>冷飲 → ${cupLabel(state.rules.cold)}</span><span>熱飲 → ${cupLabel(state.rules.hot)}</span></div><div class="robot-demo">${icon('cup')}<span>收到訂單，依條件出餐。</span></div>${btn('task','重玩自動服務工程師','secondary','data-index="1"')}`);
  const lessonIndex={orders:0,rules:1,analysis:2}[currentView];
  if(lessonIndex!==undefined)html=html.replace('</header>','</header>'+courseBanner(lessonIndex));
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
  return shell('檔案館試煉・建立資料表','QUEST 01 · 步驟 A / B',`<p class="dialog-lead">把校慶訂單寫回資料表。每個欄位代表一種資料，四張資料卡要各就各位。</p><div class="customer-bubble"><span class="customer-dot"></span>「我是小晴，想買 2 杯奶茶！」</div><p class="hint-line">拖曳資料卡到欄位，或先點卡片、再點欄位。</p><div class="data-cards">${cards.map(([key,value])=>`<button class="data-card" data-pick="${key}" data-kind="order" ${Object.values(assigned).includes(key)?'disabled':''}>${value}</button>`).join('')}</div><div class="field-grid">${fields.map(([key,label])=>`<button class="field-slot" data-drop="${key}" data-kind="order"><small>${label}</small><strong>${assigned[key]?cards.find(c=>c[0]===assigned[key])[1]:'放在這裡'}</strong></button>`).join('')}</div>${feedback()}${btn('fields-check','建立這筆訂單','primary full-width')}`);
}
function cupLabel(cup) {return cup==='cold'?'冷飲杯':cup==='hot'?'熱飲杯':'尚未設定';}
function rulesHTML() {
  return shell('程式工坊・條件判斷','QUEST 02 · 設定 → 試跑 → 除錯',`<p class="dialog-lead">機器守衛只會照程式做事。設定 if / else 分支，讓它依訂單條件選杯；杯子卡可以重複使用。</p><div class="cup-cards">${['cold','hot'].map(c=>`<button class="cup-card ${c}" data-pick="${c}" data-kind="rule">${icon('cup')}<strong>${cupLabel(c)}</strong><small>${c==='cold'?'適合冰涼飲料':'適合溫熱飲料'}</small></button>`).join('')}</div><p class="hint-line">拖曳或先點杯子卡，再點分支。兩邊也可以放同一種杯子。</p><div class="rule-flow"><div class="flow-node">讀取訂單</div><span class="flow-arrow">↓</span><div class="condition-node">如果飲料是「冷飲」</div><div class="branches"><div class="branch" data-branch="cold"><span>是 · 冷飲</span><button class="rule-slot" data-drop="cold" data-kind="rule">${icon('cup')}<strong>${cupLabel(state.rules.cold)}</strong></button></div><div class="branch" data-branch="hot"><span>否則 · 熱飲</span><button class="rule-slot" data-drop="hot" data-kind="rule">${icon('cup')}<strong>${cupLabel(state.rules.hot)}</strong></button></div></div><span class="flow-arrow">↓</span><div class="flow-node">送出飲料</div></div><details class="program-preview"><summary>看看這些積木對應的程式</summary><pre><code>if (order.type === 'cold') {
  cup = '${state.rules.cold||'尚未設定'}';
} else {
  cup = '${state.rules.hot||'尚未設定'}';
}</code></pre></details><div id="run-results" class="run-results" aria-live="polite"><p>測試輸入：冰奶茶、熱可可、冰果汁</p></div>${feedback()}${btn('run-rules',`${icon('play')}試跑這套規則`,'primary full-width')}`);
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
  return shell('分析塔・試算表公式','QUEST 03 · 步驟 A / B',`<p class="dialog-lead">用儲存格公式計算校慶銷售資料。先觀察 B 欄與 C 欄，再找出營收的計算方式。</p>${salesTable(!!viewData.calculated)}<p class="hint-line">依序點選公式積木，或拖到空格裡。先算一筆，再套用整欄。</p><div class="formula-cards">${['單價','×','銷量'].map((v,i)=>`<button class="data-card" data-pick="${i}" data-kind="formula" ${formula.includes(v)?'disabled':''}>${v}</button>`).join('')}</div><div class="formula-line"><strong>營收 ＝</strong>${[0,1,2].map(i=>`<button class="formula-slot" data-drop="${i}" data-kind="formula" aria-label="公式第 ${i+1} 格">${esc(formula[i]||'？')}</button>`).join('')}${btn('formula-reset','重排','text-button')}</div><div class="cell-formula">D2 <code>${formula.join('|')==='單價|×|銷量'?'=B2*C2':'先組合上方公式'}</code></div>${feedback()}${viewData.calculated?btn('analysis-chart','看看銷售圖表 →','primary full-width'):btn('formula-apply','套用整欄','primary full-width')}`);
}
function festivalHTML() {
  const step=viewData.step||'dedup';
  const repaired={dedup:0,serve:1,calculate:2}[step];
  return shell('雜訊核心・校慶救援','FINAL QUEST · 綜合應用',`<div class="boss-battle"><div class="noise-core" aria-hidden="true"><i></i><b>?</b></div><div><strong>雜訊核心的三層干擾</strong><p>修復進度 <span class="repair-count">${repaired}</span> / 3</p><div class="boss-health"><i style="width:${(3-repaired)/3*100}%"></i></div></div></div><p class="dialog-lead">${step==='dedup'?'第一層：排除重複訂單，用資料整理技能修復輸入。':step==='serve'?'第二層：沿用你設定的條件分支，讓助手正確處理訂單。':'第三層：依有效資料計算營收，讓校慶系統重新啟動。'}</p><div class="festival-steps"><span class="${step==='dedup'?'active':''}">資料整理</span><span class="${step==='serve'?'active':''}">程式邏輯</span><span class="${step==='calculate'?'active':''}">試算表計算</span></div>${orderRows(viewData.orders,step==='dedup',true)}<div id="run-results" class="run-results" aria-live="polite"></div>${feedback()}${step==='dedup'?btn('festival-dedup','修復輸入：確認有效訂單','primary full-width'):step==='serve'?`<p class="hint-line">已保存的程式規則：冷飲 → ${cupLabel(state.rules.cold)}，否則 → ${cupLabel(state.rules.hot)}。</p>${btn('festival-serve',`${icon('play')}執行規則，修復出餐`,'primary full-width')}`:btn('festival-calculate','執行計算，解除最後干擾','primary full-width')}`);
}
function successHTML() {
  if(viewData.final) {
    const summary=viewData.summary;
    return shell('資料迷霧解除！','QUEST COMPLETE · 校慶系統已修復',`<div class="celebration">${icon('award')}</div><p class="dialog-lead centered">你用資料整理、程式邏輯與試算表計算，完成了校慶系統救援！</p><div class="final-numbers"><div><strong>${summary.orderCount}</strong><span>筆有效訂單</span></div><div><strong>${summary.cupCount}</strong><span>杯飲料</span></div><div><strong>${summary.total}</strong><span>元總營收</span></div></div><div class="receipt">${summary.lines.map(o=>`<p><span>${esc(o.product)} ${o.price} × ${o.quantity}</span><strong>${o.revenue} 元</strong></p>`).join('')}<p><span>重複紀錄未列入營收</span><strong>合計 ${summary.total} 元</strong></p></div><div class="badge-unlocked">${icon('award')}<span><strong>資處資料勇者</strong><small>遊戲紀念徽章 · 完成三個入門學習領域的實作體驗</small></span></div><div class="final-courses">${QUESTS.map(q=>`<span>◆ ${q.course}</span>`).join('')}</div><p class="ending">原來資處科，會學習用資料、程式與試算表解決問題！</p><div class="two-buttons">${btn('knowledge','打開課程圖鑑','primary')}${btn('close','回島上繼續探索','secondary')}</div>${btn('tasks','回訪任務與練習','text-button full-width')}`);
  }
  const i=viewData.index,q=QUESTS[i];
  return shell(`${q.rune}到手！`,`QUEST 0${i+1} COMPLETE`,`${courseBanner(i)}<div class="success-seal">${icon('check')}</div><div class="learning-reveal"><span>你剛做的，就是這項學習！</span><h3>${q.course}</h3><p>${q.learned}</p><strong>生活應用</strong><p>${q.reality}</p></div><div class="upgrade-reward"><strong>知識符文已收入課程圖鑑</strong><span>${viewData.firstReward?'+25 XP · +2 顆探險星':'重玩完成 · 經驗與首次星星不重複發放'}</span></div>${btn('close','帶著符文回到地圖','primary full-width')}${btn('travel',i<2?'前往下一位守護者 →':'前往雜訊核心 →','text-button full-width',`data-index="${i+1}"`)}`);
}
const decorGroups={sign:{name:'營地屋頂',options:[['mint','薄荷綠'],['pink','柔和粉']]},chair:{name:'營地椅子',options:[['cat','貓咪'],['bear','熊熊']]},plant:{name:'營地盆栽',options:[['flower','小花'],['cactus','仙人掌']]}};
function decorHTML() {
  return shell('冒險營地佈置','MAKE IT YOURS',`<div class="decor-balance">${icon('star')}<strong>${state.stars} 顆探險星</strong><span>每組解鎖 2 顆，組內免費切換</span></div><div class="decor-preview">${renderScene(state,{preview:preview||{},interactive:false})}<span class="preview-label">${preview?'預覽中 · 尚未套用':'目前營地'}</span></div><div class="decor-groups">${Object.entries(decorGroups).map(([key,g])=>`<section class="decor-group"><div><h3>${g.name}</h3><small>${state.unlocked[key]?'已解鎖 · 免費切換':'2 顆星星解鎖整組'}</small></div><div class="decor-options">${g.options.map(([value,label])=>btn('decor-preview',label,(preview?.[key]||state.decor[key])===value?'decor-option selected':'decor-option',`data-group="${key}" data-value="${value}"`)).join('')}</div>${btn('decor-apply',state.unlocked[key]?'套用造型':'解鎖並套用','secondary',`data-group="${key}"`)}</section>`).join('')}</div>${feedback()}<p class="small-note">探險星只用來佈置營地，不影響闖關。</p>` , true);
}
function resultsHTML() {
  return shell('我的冒險者紀錄','CHARACTER · 知識就是你的能力',`<div class="results-identity"><span class="avatar-mini ${state.avatar}">${avatarSvg(state.avatar)}</span><div><h3>${esc(state.name)}</h3><p>Lv.${level()} ${state.finalComplete?'資料勇者':'資訊見習生'} · ${experience(state)} XP</p></div>${btn('rename','編輯','text-button')}</div><div class="rune-inventory">${QUESTS.map((q,i)=>`<span class="${state.completed[i]?'obtained':''}">${state.completed[i]?'◆':'◇'} ${q.rune}</span>`).join('')}</div><div class="skill-results">${QUESTS.map((q,i)=>`<div class="skill-result ${state.completed[i]?'done':''}"><span>${icon(state.completed[i]?'check':['tasks','cup','chart'][i])}</span><div><strong>${q.course}<small>${state.completed[i]?'已完成實作':'尚待探索'}</small></strong><p>${q.skill}</p></div></div>`).join('')}</div><div class="badge-unlocked ${state.finalComplete?'':'locked'}">${icon('award')}<span><strong>${state.finalComplete?'資處資料勇者':'最終紀念徽章尚未解鎖'}</strong><small>${state.finalComplete?'紀念你的課程探索，不代表正式證照':'完成雜訊核心綜合任務後取得'}</small></span></div><div class="two-buttons">${btn('knowledge','查看課程圖鑑','primary')}${btn('decor','營地佈置','secondary')}</div>${btn('tasks','回訪任務與練習','text-button full-width')}`);
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
    const repairs=dialog.querySelector('.repair-count');if(repairs)repairs.textContent='2';
    const health=dialog.querySelector('.boss-health i');if(health)health.style.width='33.333%';
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
  if(a==='travel'){await travel(index);return;}
  if(a==='move'){moveHero(Number(button.dataset.dx),Number(button.dataset.dy));return;}
  if(a==='talk'){talk();return;}
  if(a==='accept-task'){startTask(index);return;}
  if(a==='knowledge'){openModal('knowledge');return;}
  if(a==='enter') {
    if(location.hash!=='#shop')location.hash='shop';
    else if(!rpg.introduced)openModal('intro');
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
document.addEventListener('keydown',event=>{
  if(dialog.open||!event.target.closest('.adventure-map'))return;
  const directions={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
  const direction=directions[event.key.toLowerCase()];
  if(direction){event.preventDefault();moveHero(...direction);}
  else if(event.key==='Enter'&&!event.target.closest('button')){event.preventDefault();talk();}
});
dialog.addEventListener('submit',event=>{
  if(event.target.id!=='intro-form')return;
  event.preventDefault();
  const data=new FormData(event.target);
  const name=String(data.get('name')||'').trim();
  if(!name || Array.from(name).length>12) {say('請輸入 1～12 個字的冒險者名字。');return;}
  state.name=name;state.avatar=data.get('avatar')==='peach'?'peach':'mint';state.started=true;rpg.introduced=true;
  persist();render();closeModal();toast('冒險開始！點選資料檔案館，沿路找到索引學者。');
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
  stopWalk();
  if(dialog.open)closeModal();
  render();
  if(location.hash==='#shop'&&!rpg.introduced)openModal('intro');
  else document.querySelector(location.hash==='#shop'?'.back-link':'.hero-cta')?.focus();
});
window.addEventListener('pagehide',()=>{cancelRun();clearTimeout(toastTimer);});
render();
if(loaded.warning)toast(loaded.warning);
if(location.hash==='#shop'&&!rpg.introduced)openModal('intro');

if(state.finalComplete)void processCampusReward(state,persist);
