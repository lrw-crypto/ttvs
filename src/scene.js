import { project, block, floor, outdoors, walls, wallDetails, foliage, frontGarden, cafeTable, coffeeMachine, breadDisplay } from './shop-world.js?v=588b10e265af';

// Original SVG artwork. The scene uses fixed positions so characters never cross furniture.
const escapeText = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function person(x, y, outfit = 'mint', variant = 'manager', scale = 1) {
  const color = ({peach:'#e79892',navy:'#7e9db4',honey:'#e6b461',mint:'#73ad8b'})[outfit] || '#73ad8b';
  const skin = variant === 'customer' ? '#f0c9a5' : '#f7d7bc';
  return `<g transform="translate(${x} ${y}) scale(${scale})" class="shop-person ${variant === 'manager' ? 'shop-manager' : ''}">
    <ellipse cy="47" rx="28" ry="10" fill="#576c5c" opacity=".13"/>
    <path d="M-17 34v12m34-12v12" stroke="#6a5149" stroke-width="12" stroke-linecap="round"/>
    <path d="M-25 6Q-26-9 0-10Q26-9 25 6l-5 30q-20 8-40 0z" fill="${color}" stroke="#6d7560" stroke-width="2"/>
    ${variant === 'manager' ? '<path d="M-13-6v34q13 5 26 0V-6" fill="#fff5dc"/><rect x="-8" y="15" width="16" height="9" rx="3" fill="#e9c383"/><path d="M-10 6h20M-10 29h20" stroke="#d9cba9" stroke-dasharray="2 2"/>' : '<path d="M-22 9h44" stroke="#fff1db" stroke-width="6"/>'}
    <path class="shop-wave-hand" d="M-24 2q-14 10-13 24m61-24q13 7 15 21" stroke="${skin}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <ellipse cy="-28" rx="33" ry="34" fill="${skin}" stroke="#785e50" stroke-width="2.5"/><path d="M-30-17q28 34 59-2" fill="none" stroke="#dfac8b" stroke-width="4" opacity=".45"/>
    ${outfit === 'peach' ? '<path d="M-33-25Q-38-64-2-66q39 0 35 42L19-36 7-48q-14 22-40 23" fill="#735344"/><circle cx="-31" cy="-13" r="10" fill="#735344"/><circle cx="31" cy="-13" r="10" fill="#735344"/><path d="M22-53l14-6-3 16z" fill="#edb0aa"/>' : '<path d="M-33-26Q-38-65 0-67q40 4 33 42L18-41 7-35 8-50q-15 23-41 24" fill="#514a43"/>'}
    <ellipse cx="-13" cy="-26" rx="3.8" ry="5.4" fill="#4b3930"/><ellipse cx="13" cy="-26" rx="3.8" ry="5.4" fill="#4b3930"/><g fill="#fffaf0"><circle cx="-14" cy="-28" r="1.4"/><circle cx="12" cy="-28" r="1.4"/></g>
    <ellipse cx="-22" cy="-16" rx="7" ry="4" fill="#eaa497" opacity=".75"/><ellipse cx="22" cy="-16" rx="7" ry="4" fill="#eaa497" opacity=".75"/>
    <path d="M-6-14q6 7 12 0" stroke="#9a6158" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${variant === 'manager' ? '<path d="M-31-51q33-19 62 0l-2-10q-28-16-57 0z" fill="#fff6df"/><rect x="-15" y="-66" width="30" height="14" rx="6" fill="#fff6df"/><path d="M-7-61h14" stroke="#a4c8a5" stroke-width="3" stroke-linecap="round"/>' : ''}
  </g>`;
}

function plant(x, y, style = 'flower', scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cy="8" rx="24" ry="9" fill="#7b7357" opacity=".12"/>
    <path d="M-19-22l5 30q14 9 28 0l5-30" fill="#e5a784" stroke="#b57e62" stroke-width="2"/><ellipse cy="-22" rx="19" ry="7" fill="#f1c9a7"/>
    ${style === 'cactus' ? '<path d="M-1-26v-40m-1 22h-12v-15m14 23h13v-14" stroke="#78a77b" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M0-60v29m-12-23v7m25-1v7" stroke="#adc69a" stroke-width="2"/><circle cx="2" cy="-71" r="7" fill="#eba5ad"/>' : '<path d="M0-23v-39m0 17q-19-19-23-3 10 9 23 6m0 0q19-19 23-3-10 9-23 6" stroke="#6c9f77" stroke-width="4" fill="#94b988"/><g fill="#f2b2b8"><circle cy="-68" r="10"/><circle cx="-11" cy="-60" r="10"/><circle cx="10" cy="-59" r="10"/><circle cx="-6" cy="-49" r="9"/><circle cx="7" cy="-49" r="9"/></g><circle cy="-58" r="8" fill="#f7d47f"/>'}
  </g>`;
}

function chair(x, y, type = 'cat', scale = 1) {
  const bear = type === 'bear';
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="20" rx="31" ry="12" fill="#897758" opacity=".1"/><path d="M-21-4v25m38-25v25" stroke="#a9774e" stroke-width="7" stroke-linecap="round"/><path d="M-29-9l28-15 29 15-28 17z" fill="#e9b57c" stroke="#b67e50" stroke-width="2"/><path d="M-29-13v-42q27-18 55 0v42q-28 14-55 0" fill="${bear ? '#d4aa7b' : '#f5d7ad'}" stroke="#b67e50" stroke-width="2"/>${bear ? '<circle cx="-21" cy="-56" r="10" fill="#d4aa7b" stroke="#b67e50" stroke-width="2"/><circle cx="18" cy="-56" r="10" fill="#d4aa7b" stroke="#b67e50" stroke-width="2"/>' : '<path d="M-28-47l-2-24 22 12m16 0 20-14-2 26" fill="#f5d7ad" stroke="#b67e50" stroke-width="2"/>'}<path d="M-10-40v2m19-2v2" stroke="#785848" stroke-width="3" stroke-linecap="round"/><path d="M-3-32h6l-3 4z" fill="#c28676"/></g>`;
}

function robot(complete, cup = null, x = 741, y = 423) {
  const cupArt = cup === 'cold'
    ? '<path d="M35-5h22l-3 24q-9 5-17 0z" fill="#b5ded2" stroke="#6caa9b" stroke-width="2"/><path d="m48-21-4 18" stroke="#639b86" stroke-width="4" stroke-linecap="round"/><path d="M34-5h24" stroke="#effaf0" stroke-width="5"/><path d="M40 4h4v4h-4zm8 5h4v4h-4z" fill="#f6fff3"/>'
    : cup === 'hot'
      ? '<path d="M53-4q18-1 12 14-3 6-12 4" fill="none" stroke="#be8583" stroke-width="4"/><path d="M34-7h23v23q-11 9-23 0z" fill="#e8aaa6" stroke="#be8583" stroke-width="2"/><ellipse cx="45.5" cy="-7" rx="11.5" ry="4" fill="#83624f"/><path d="M40-16q-5-7 0-13m11 13q-5-7 0-13" stroke="#c7beaa" stroke-width="2" fill="none" stroke-linecap="round"/>'
      : '<path d="M33-3h23l-3 21H36z" fill="#f0c496" stroke="#a47a54" stroke-width="2"/><path d="M34-3h21" stroke="#fff3dd" stroke-width="5"/>';
  return `<g transform="translate(${x} ${y})" class="shop-robot"><ellipse cy="50" rx="32" ry="11" fill="#5a775e" opacity=".16"/><path d="M-16 39v8m32-8v8" stroke="#6b8f82" stroke-width="12" stroke-linecap="round"/><rect x="-28" y="1" width="56" height="40" rx="18" fill="#f4f4e7" stroke="#8ca99a" stroke-width="2"/><path d="M-28 14l-13 11m69-11 14-7" stroke="#a5c7b7" stroke-width="10" stroke-linecap="round"/><g class="shop-robot-cup">${cupArt}</g><path d="M0-38v-13" stroke="#9bbcaf" stroke-width="4"/><circle cy="-54" r="6" fill="${complete ? '#e8bf74' : '#add3c1'}"/><rect x="-35" y="-38" width="70" height="49" rx="19" fill="#f6f8ef" stroke="#8ca99a" stroke-width="2"/><rect x="-25" y="-27" width="50" height="25" rx="11" fill="#769f92"/><path d="M-13-17v3m26-3v3" stroke="#f8ffeb" stroke-width="5" stroke-linecap="round"/><path d="M-5-9q5 4 10 0" stroke="#f8ffeb" stroke-width="2" fill="none"/><circle cy="25" r="5" fill="#e3bc76"/></g>`;
}

export function avatarSvg(avatar = 'mint') {
  return `<svg viewBox="-65 -92 130 155" aria-hidden="true">${person(0, 0, avatar, 'manager', 1.15)}</svg>`;
}

export function robotSvg(cup) {
  const label = cup === 'cold' ? '助手拿出冷飲杯' : cup === 'hot' ? '助手拿出熱飲杯' : '助手等待設定杯型';
  return `<svg class="service-robot-art" viewBox="-65 -75 140 145" role="img" aria-label="${label}">${robot(true, cup, 0, 0)}</svg>`;
}

const stationSymbol = kind => {
  const path = {orders:'M7 4h10v16H5V6h2m2-3h6v4H9Zm0 8h6m-6 4h6',rules:'M5 7h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Zm11 1h2a3 3 0 0 1 0 6h-2M8 3v1m5-1v1',analysis:'M4 3v18h17M8 16v-4m5 4V8m5 8V5'}[kind];
  return `<svg class="station-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
};
let sceneSequence = 0;
export function renderScene(state, { preview = null, interactive = true } = {}) {
  const sceneId = `shop-${++sceneSequence}`;
  const done = state.completed || [false, false, false];
  const decor = { ...state.decor, ...preview };
  const sign = decor.sign === 'pink' ? '#efb7b0' : '#a8c791';
  const name = escapeText(Array.from(state.name || '萌萌校園店').slice(0, 12).join(''));
  const at = (x, y, z=0) => project(x,y,z);
  const guestA = at(490,155), guestB = at(480,465), guestC = at(215,365);
  const manager = [600,175], barista = at(355,300);
  const tableA = at(460,225), tableB = at(410,490);
  const cups = [0,1,2].map(i=>`<g transform="translate(${i*17} ${i*8})"><path d="M-8-20h16l-2 19q-6 5-12 0Z" fill="${i%2?'#efc6a7':'#fff2d4'}" stroke="#a48c5d" stroke-width="1.7"/><ellipse cy="-20" rx="8" ry="3" fill="#967144"/></g>`).join('');
  const menuState = state.finalComplete ? '店長，開幕快樂！' : done[1] ? '一杯冰奶茶，謝謝！' : done[0] ? '訂單變得好清楚！' : '店長，我想點餐！';
  return `<div class="shop-scene${state.finalComplete ? ' shop-scene--celebrate' : ''}">
    <svg class="shop-art" viewBox="0 0 1000 800" role="img" aria-labelledby="${sceneId}-title ${sceneId}-desc">
      <title id="${sceneId}-title">${name}的小店</title><desc id="${sceneId}-desc">花園圍欄環繞的等角咖啡小店，有木質櫃檯、飲品設備、座位、四位原創角色與助手。任務完成後，店內增加電子訂單機、助手工作站、分析看板和餅乾展示櫃。</desc>
      ${outdoors(sceneId)}${floor()}${walls()}${wallDetails(name,sign,done[2])}${foliage()}
      <g transform="translate(500 60)"><path d="M0 0v71" stroke="#805d39" stroke-width="4"/><path d="M-29 90q1-27 29-27t29 27Z" fill="#e2b25b" stroke="#9f743a" stroke-width="3"/><ellipse cy="90" rx="29" ry="8" fill="#fff1bb"/><path d="M-18 94q18 8 36 0" stroke="#ffe8a0" stroke-width="4"/></g>
      ${person(...manager,state.avatar,'manager',.95)}
      ${block(30,40,330,90,70,['#f7dfac','#af7b4e','#c79257'])}
      ${coffeeMachine(...at(100,72,70))}
      <g transform="translate(${at(230,80,70).join(' ')})">${cups}</g>
      <g transform="translate(${at(305,85,70).join(' ')})"><ellipse rx="27" ry="14" fill="#f8eac4" stroke="#c0a275" stroke-width="2"/><path d="M-18-2q0-16 14-15t15 15m-8 8q1-16 14-14T29 4" fill="#dfb773" stroke="#b98a47" stroke-width="2"/></g>
      ${block(30,130,90,260,70,['#f1d5a0','#a97848','#c6955b'])}
      <g transform="translate(${at(75,205,70).join(' ')})"><ellipse rx="23" ry="13" fill="#faf0d2" stroke="#c8af80"/><path d="M-16-7h32v-12h-32Z" fill="#d9b87b" stroke="#a18b54"/><path d="M-16-20h32" stroke="#8eae6a" stroke-width="6"/><circle cx="-9" cy="-9" r="3" fill="#b48a42"/></g>
      <g class="shop-order-device" transform="translate(${at(85,335,70).join(' ')})">
        ${done[0] ? '<path d="m-24 13 20-11 30 16-22 12Z" fill="#6e7b4c" stroke="#4c603e" stroke-width="2"/><path d="M0 12v-22" stroke="#566d47" stroke-width="7"/><path d="M-31-58 27-27V10l-58-31Z" fill="#5b7b59" stroke="#3d5f43" stroke-width="3"/><path d="M-24-46 20-23V-1l-44-23Z" fill="#e0efc0"/><path d="m-17-34 28 15m-28-5 19 10m-19-1 26 14" stroke="#91b17a" stroke-width="3"/><path d="m13 13 10 5" stroke="#fff2b6" stroke-width="3"/>' : '<path d="m-27-26 39 21-12 27-39-21Z" fill="#ad7f47" stroke="#8c673c" stroke-width="2"/><path d="m-25-26 35 19L-1 15-35-3Z" fill="#fff3ce"/><path d="m-23-17 25 13m-29-6 23 12m-27-4 15 8" stroke="#a9a17a" stroke-width="2"/><path d="m20-14-13 25" stroke="#6b9562" stroke-width="5" stroke-linecap="round"/>'}
      </g>
      ${plant(...at(55,520),decor.plant,.88)}
      ${chair(guestA[0],guestA[1]+9,decor.chair,.82)}
      ${person(...guestA,'navy','customer',.8)}
      ${cafeTable(...tableA)}
      ${chair(tableA[0]-56,tableA[1]+21,decor.chair,.78)}
      ${person(...guestC,'honey','customer',.84)}
      ${done[1] ? `<g class="shop-service-station">${block(310,235,80,70,42,['#f2e5b5','#80a071','#a0bc89'])}<g transform="translate(${at(330,255,42).join(' ')})">${cups}</g></g>` : ''}
      ${robot(done[1],null,...barista)}
      ${chair(guestB[0]+5,guestB[1]+9,decor.chair,.8)}
      ${person(...guestB,'peach','customer',.82)}
      ${cafeTable(...tableB)}
      ${chair(tableB[0]-58,tableB[1]+20,decor.chair,.78)}
      ${done[2] ? `<g class="shop-cookie-showcase">${breadDisplay(...at(550,405))}</g>` : plant(...at(570,395),decor.plant,.8)}
      ${plant(...at(590,65),decor.plant,.88)}
      <g class="shop-speech" transform="translate(${guestC[0]-55} ${guestC[1]-110})"><rect x="-10" y="-16" width="165" height="42" rx="17" fill="#fff9de" stroke="#aa8b5d" stroke-width="2"/><path d="m58 25 9 13 9-13" fill="#fff9de" stroke="#aa8b5d" stroke-width="2"/><path d="M59 25h16" stroke="#fff9de" stroke-width="3"/><text x="72" y="10" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="#665b3d">${menuState}</text></g>
      <g class="shop-guest-thought" transform="translate(${guestA[0]+10} ${guestA[1]-100})"><rect x="-37" y="-16" width="92" height="33" rx="14" fill="#fff9de" stroke="#c2a676" stroke-width="1.5"/><path d="M6 17 0 27l-1-11" fill="#fff9de"/><text x="9" y="6" text-anchor="middle" font-size="13" font-family="system-ui,sans-serif" fill="#897347">好香呀！</text></g>
      ${frontGarden()}
      ${state.finalComplete ? '<g class="shop-bunting"><path d="M74 313Q500 510 926 313" fill="none" stroke="#9b713d" stroke-width="3"/>'+Array.from({length:13},(_,i)=>`<path d="m${140+i*57} ${342+Math.sin((i+1)/14*Math.PI)*68} 15 28 15-19" fill="${i%2?'#92b376':'#edb6a0'}" stroke="#fff0cf" stroke-width="1.5"/>`).join('')+'</g>' : ''}
    </svg>
    ${interactive ? `<button type="button" class="shop-hotspot shop-hotspot--orders${done[0]?' is-unlocked':''}" data-station="orders" aria-label="${done[0]?'查看電子訂單機與整理完成的訂單':'開始訂單整理員任務'}">${stationSymbol('orders')}<span class="shop-hotspot-label">${done[0]?'電子訂單機':'整理訂單'}</span><span aria-hidden="true">＋</span></button>
    <button type="button" class="shop-hotspot shop-hotspot--rules${done[1]?' is-unlocked':''}" data-station="rules" aria-label="${done[1]?'查看助手工作站與已儲存的規則':'開始自動服務工程師任務'}">${stationSymbol('rules')}<span class="shop-hotspot-label">${done[1]?'助手工作站':'訓練助手'}</span><span aria-hidden="true">＋</span></button>
    <button type="button" class="shop-hotspot shop-hotspot--analysis${done[2]?' is-unlocked':''}" data-station="analysis" aria-label="${done[2]?'查看銷售分析看板':'開始銷售分析師任務'}">${stationSymbol('analysis')}<span class="shop-hotspot-label">${done[2]?'分析看板':'小店分析'}</span><span aria-hidden="true">＋</span></button>` : ''}
  </div>`;
}
