// Original isometric furniture and garden. All coordinates belong to one fixed room.
// x / y are floor coordinates; z is height above the floor.
export const project = (x, y, z = 0) => [500 + (x - y) * .69, 190 + (x + y) * .36 - z];
const points = coordinates => coordinates.map(p => project(...p).join(',')).join(' ');
const poly = (coordinates, fill, stroke = '#9b734e', width = 2) => `<polygon points="${points(coordinates)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;

export function block(x, y, w, d, h, colors = ['#f8dfb1', '#b9794e', '#ce9863']) {
  let panels='';
  if(['#af7b4e','#a97848'].includes(colors[1])) {
    for(let i=0;i<Math.max(1,Math.floor(w/90));i++) {
      const count=Math.max(1,Math.floor(w/90)),left=x+i*w/count+8,right=x+(i+1)*w/count-8;
      const [knobX,knobY]=project((left+right)/2,y+d,h*.7);
      panels+=poly([[left,y+d,h-10],[right,y+d,h-10],[right,y+d,8],[left,y+d,8]],'#c5935b','#91683e',1.5)+`<circle cx="${knobX}" cy="${knobY}" r="2.8" fill="#e9c47b" stroke="#97713b"/>`;
    }
    for(let i=0;i<Math.max(1,Math.floor(d/80));i++) {
      const count=Math.max(1,Math.floor(d/80)),top=y+i*d/count+8,bottom=y+(i+1)*d/count-8;
      panels+=poly([[x+w,top,h-10],[x+w,bottom,h-10],[x+w,bottom,8],[x+w,top,8]],'#d4a76d','#a37946',1.5);
    }
  }
  return `<g class="world-furniture">${poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],colors[0])}${poly([[x,y+d,h],[x+w,y+d,h],[x+w,y+d,0],[x,y+d,0]],colors[1])}${poly([[x+w,y,h],[x+w,y+d,h],[x+w,y+d,0],[x+w,y,0]],colors[2])}${panels}</g>`;
}

export function floor() {
  const tiles = [];
  const palette = ['#d69c6e', '#e5b68b', '#dfa87a', '#e9bd91', '#dca373'];
  for(let x=0;x<10;x++)for(let y=0;y<10;y++) {
    tiles.push(poly([[x*62,y*62],[x*62+62,y*62],[x*62+62,y*62+62],[x*62,y*62+62]],palette[(x*3+y*7)%palette.length],'#aa774e',1));
  }
  return `<g class="world-floor">${poly([[-10,-10,0],[630,-10,0],[630,630,0],[-10,630,0]],'#aa7b51','#865e3f',3)}${poly([[-10,630,0],[630,630,0],[630,630,-22],[-10,630,-22]],'#986e47')}${poly([[630,-10,0],[630,630,0],[630,630,-22],[630,-10,-22]],'#c0905c')}${tiles.join('')}</g>`;
}

function tree(x,y,scale=1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="28" rx="61" ry="24" fill="#46653a" opacity=".17"/><path d="M-12 17-6-86H8l8 103q-14 10-28 0" fill="#a77548" stroke="#775335" stroke-width="3"/><path d="m0-41-23-29m28 20 20-32" stroke="#8d603d" stroke-width="9" stroke-linecap="round"/><g stroke="#527d3c" stroke-width="3"><circle cy="-109" r="43" fill="#77a84d"/><circle cx="-35" cy="-82" r="35" fill="#7faf53"/><circle cx="32" cy="-78" r="38" fill="#6e9f47"/><circle cy="-67" r="38" fill="#78a94b"/></g><path d="M-32-105q11-34 40-25M-56-80q7-18 22-17" fill="none" stroke="#a6c968" stroke-width="9" stroke-linecap="round"/></g>`;
}

export function outdoors(id) {
  let paving='';
  for(let x=-1;x<12;x++)for(let y=0;y<3;y++)paving+=`<rect x="${x*94+y%2*47}" y="${653+y*44}" width="91" height="41" rx="3" fill="${y%2?'#c9cbbd':'#d4d3c5'}" stroke="#aeb3a5"/>`;
  return `<defs><linearGradient id="${id}-grass" x2="0" y2="1"><stop stop-color="#e3edba"/><stop offset="1" stop-color="#bfd391"/></linearGradient><pattern id="${id}-lawn" width="32" height="32" patternUnits="userSpaceOnUse"><path d="m6 18 2-5 2 5m14 8 2-5 2 5" fill="none" stroke="#9eb96b" opacity=".28"/></pattern><radialGradient id="${id}-sun"><stop stop-color="#fff9d9" stop-opacity=".7"/><stop offset="1" stop-color="#fff9d9" stop-opacity="0"/></radialGradient></defs><rect width="1000" height="800" rx="28" fill="url(#${id}-grass)"/><rect width="1000" height="800" fill="url(#${id}-lawn)"/><path d="M-80 640 500 378 1080 640v200H-80Z" fill="#b7bcad"/><g opacity=".9">${paving}</g><path d="M0 770h1000" stroke="#faf6dd" stroke-width="7" stroke-dasharray="65 36"/><ellipse cx="500" cy="410" rx="445" ry="285" fill="url(#${id}-sun)"/>${tree(65,350,.85)}${tree(938,355,.9)}<path d="m76 480 30 13m807-8 19-8M83 578l22 8m791 20 20-9" stroke="#91ad64" stroke-width="6" stroke-linecap="round"/>`;
}

export function walls() {
  return `<g class="world-walls">${poly([[0,0,0],[0,620,0],[0,620,150],[0,0,150]],'#fff1d0','#8e6848',4)}${poly([[0,0,0],[620,0,0],[620,0,150],[0,0,150]],'#efe4bf','#8e6848',4)}${poly([[0,0,150],[0,620,150],[0,620,164],[0,0,164]],'#875b39','#724c32',3)}${poly([[0,0,150],[620,0,150],[620,0,164],[0,0,164]],'#ab7749','#724c32',3)}<path d="M73 400 500 177 928 400" fill="none" stroke="#b98a56" stroke-width="13"/><path d="M74 396 500 173 926 396" fill="none" stroke="#d8b17b" stroke-width="3"/></g>`;
}

export function wallDetails(name, sign, analysisComplete) {
  const jars=Array.from({length:6},(_,i)=>`<g transform="translate(${12+i*23} 0)"><rect y="-28" width="13" height="25" rx="3" fill="${['#c48856','#dab875','#81a48b'][i%3]}" stroke="#705c40" stroke-width="1.5"/><rect x="-1" y="-32" width="15" height="6" rx="2" fill="#e1bf83"/><rect x="3" y="-18" width="7" height="8" fill="#fff1cf"/></g>`).join('');
  const boards=Array.from({length:5},(_,i)=>`<path d="M14 ${43+i*17}h${i%2?92:118}" stroke="#e3d4a5" stroke-width="3" stroke-linecap="round"/>`).join('');
  return `<g transform="matrix(.9 -.47 0 1 115 290)"><rect x="-5" y="-99" width="177" height="141" rx="5" fill="#8f653e" stroke="#61472f" stroke-width="3"/><rect y="-94" width="167" height="132" fill="#f5dcaa"/><g transform="translate(2 -48)">${jars}</g><path d="M-5-48h177M-5 4h177" stroke="#98663b" stroke-width="8"/>${[0,1,2,3,4].map(i=>`<path d="M${12+i*31}-25h20v23H${12+i*31}z" fill="#fff8df" stroke="#ad9a71" stroke-width="1.5"/>`).join('')}</g><g transform="matrix(.9 -.47 0 1 316 183)"><rect x="-7" y="-8" width="155" height="162" rx="6" fill="#9f7148" stroke="#694b34" stroke-width="3"/><rect width="141" height="146" rx="2" fill="#3d5a48"/><text x="70" y="26" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="#fff0c7" text-anchor="middle">小店 MENU</text>${boards}<path d="M28 132h75" stroke="#99b29a" stroke-width="3"/></g><g transform="matrix(.91 .475 0 1 638 140)"><rect x="-5" y="-5" width="235" height="114" rx="5" fill="#986f45"/><rect width="225" height="104" rx="3" fill="#b4d8c5" stroke="#f9e9bd" stroke-width="6"/><path d="M0 75q38-29 78-1t75 0 73-4v34H0" fill="#8ab18c"/><path d="M75 0v104m75-104v104M0 44h225" stroke="#fff6da" stroke-width="6"/><path d="M-10-12h245v22H-10Z" fill="#6b9360" stroke="#4e724b" stroke-width="2"/>${[0,1,2,3,4,5].map(i=>`<path d="M${-10+i*41}-12h21v35q-10 9-21 0Z" fill="#fff2ce"/>`).join('')}</g><g transform="matrix(.91 .475 0 1 564 53)"><rect x="-6" y="-7" width="290" height="61" rx="9" fill="#795233" stroke="#5f442e" stroke-width="2"/><rect width="278" height="47" rx="6" fill="${sign}" stroke="#fff1cb" stroke-width="3"/><path d="m17 13 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#ffe8a8"/><text x="151" y="30" fill="#365c3d" font-family="system-ui,sans-serif" font-size="${name.length>8?17:22}" font-weight="900" text-anchor="middle">${name}</text></g><g transform="matrix(.9 .47 0 1 783 239)"><rect x="-5" y="-5" width="114" height="97" rx="5" fill="#956b41" stroke="#765032" stroke-width="2"/><rect width="104" height="87" rx="3" fill="${analysisComplete?'#fff4ce':'#69866b'}"/><text x="52" y="16" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" fill="${analysisComplete?'#577346':'#fff1c7'}">${analysisComplete?'小店分析':'開店備忘'}</text>${analysisComplete?'<path d="M12 69h80M12 29v40" stroke="#a79c76" stroke-width="2"/><path d="M25 67V44m25 23V32m25 35V50" stroke-width="13" stroke="#85a363"/><text x="52" y="82" fill="#7f6e47" text-anchor="middle" font-size="8">今日營收 580 元</text>':'<path d="M17 35h65M17 48h58M17 61h62" stroke="#dce5b8" stroke-width="4"/>'}</g>`;
}

export function foliage() {
  let leaves='';
  for(let i=0;i<23;i++) {
    const [x,y]=project(0,i*27,166);
    const [x2,y2]=project(i*27,0,166);
    for(const [a,b] of [[x,y],[x2,y2]])leaves+=`<g transform="translate(${a} ${b})"><ellipse cy="3" rx="17" ry="9" fill="#58864a" stroke="#406d3c" stroke-width="1.5"/><ellipse cx="-5" cy="-3" rx="12" ry="8" fill="#81a957"/><circle cx="8" cy="-3" r="3.8" fill="#f8dc88"/><circle cx="-9" cy="5" r="3" fill="#ffefc0"/></g>`;
  }
  return `<g class="world-greenery">${leaves}</g>`;
}

export function frontGarden() {
  let hedge='';
  for(const side of ['left','right']) {
    for(let i=0;i<10;i++) {
      const x=side==='left'?i*52:620;
      const y=side==='left'?620:i*52;
      const [a,b]=project(x,y,0);
      hedge+=`<g transform="translate(${a} ${b})"><path d="M-18-5 7-18 28-5 2 9v34l-20-11Z" fill="#a97445" stroke="#765332" stroke-width="2"/><path d="M2 9 28-5v33L2 43Z" fill="#c08d55" stroke="#765332" stroke-width="2"/><path d="M-18 1 2 13 28-1M-18 14 2 26 28 12" fill="none" stroke="#dfb375" stroke-width="2"/><ellipse cy="-12" rx="28" ry="18" fill="#4d813d" stroke="#426b33" stroke-width="2"/><ellipse cx="-4" cy="-17" rx="21" ry="15" fill="#719d48"/><g fill="#ffecc1"><circle cx="-11" cy="-22" r="4"/><circle cx="10" cy="-13" r="3.8"/></g><g fill="#e9b06c"><circle cx="-11" cy="-22" r="1.8"/><circle cx="10" cy="-13" r="1.8"/></g></g>`;
    }
  }
  return `<g class="world-garden">${hedge}<path d="m438 639 62-32 62 32-62 34Z" fill="#e0c99f" stroke="#a8895e" stroke-width="2"/><path d="M438 639v12l62 34 62-34v-12l-62 34Z" fill="#c1a779" stroke="#a8895e" stroke-width="2"/><g transform="translate(212 615)"><path d="m-28 5 5-94 64 28-6 94Z" fill="#cda16b" stroke="#825933" stroke-width="4"/><path d="m-19 0 3-75 48 21-5 75Z" fill="#416146" stroke="#fff0c7" stroke-width="3"/><text x="6" y="-29" font-family="system-ui,sans-serif" text-anchor="middle" font-size="11" font-weight="800" fill="#fff1c6" transform="rotate(22 6 -29)">歡迎光臨</text><path d="M-3-18 14-10M-2-9l12 6" stroke="#c8d6a4" stroke-width="3"/><path d="M30 33 56 48 43-39" fill="#b58750" stroke="#825933" stroke-width="3"/></g>${tree(60,690,.8)}${tree(925,676,.78)}</g>`;
}

export function cafeTable(x,y) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="24" rx="58" ry="22" fill="#725333" opacity=".15"/><path d="M-25-8v34m53-34v34" stroke="#825738" stroke-width="9" stroke-linecap="round"/><path d="m-57-29 55-31 61 31-57 31Z" fill="#bd8c54" stroke="#8f633d" stroke-width="2"/><path d="M-57-35-2-66 59-35 2-5Z" fill="#e9c38c" stroke="#8f633d" stroke-width="2"/><path d="M-51-34-1-61 53-34" fill="none" stroke="#f8dcad" stroke-width="3"/><g transform="translate(0 -35)"><ellipse cy="3" rx="19" ry="10" fill="#f9e9c3" stroke="#cdb37c"/><path d="M-13-16h20V0q-10 8-20 0Z" fill="#fff7dd" stroke="#a19c78" stroke-width="1.5"/><path d="M7-13q14 0 8 9L8-3" fill="none" stroke="#a19c78" stroke-width="2"/><ellipse cx="-3" cy="-16" rx="10" ry="4" fill="#a67b50"/></g></g>`;
}

export function coffeeMachine(x,y) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="25" rx="43" ry="15" fill="#88613b" opacity=".18"/><path d="m-42-36 22-12 62 32-21 14-63-32Z" fill="#d7dbca" stroke="#6e7969" stroke-width="2"/><path d="M-42-36 21-4v44l-63-32Z" fill="#e9e4cb" stroke="#7b806b" stroke-width="2"/><path d="M21-4 42-16v45L21 40Z" fill="#adb7a4" stroke="#7b806b" stroke-width="2"/><path d="M-32-20 11 2v20l-43-22Z" fill="#657368"/><path d="M-20-9v17m21-7v17" stroke="#c1c9b5" stroke-width="5"/><path d="M-41 9 21 40l15-8-62-31Z" fill="#c3c4ac" stroke="#8e967d"/><path d="M-25 2-12 9v13l-13-6Zm26 13 13 7v13L1 28Z" fill="#fff5d7" stroke="#a39976"/><circle cx="7" cy="-8" r="4" fill="#d2ac58"/><path d="M-23-44q-6-12 0-21m18 30q-7-14 0-21" stroke="#fff6dd" stroke-width="3" opacity=".7" fill="none" stroke-linecap="round"/></g>`;
}

export function breadDisplay(x,y) {
  return `<g transform="translate(${x} ${y})"><path d="m-42-3 46-25 46 25-46 25Z" fill="#dfbe87" stroke="#8c6b42" stroke-width="2"/><path d="M-42-3 4 22v37l-46-25Z" fill="#b4854d" stroke="#8c6b42" stroke-width="2"/><path d="M4 22 50-3v36L4 59Z" fill="#cba268" stroke="#8c6b42" stroke-width="2"/><path d="M-42-3v-49L4-77 50-52v49L4 22Z" fill="#e1efdd" fill-opacity=".62" stroke="#8eab8d" stroke-width="2"/><path d="M4-77v49L50-3M-42-52 4-28 50-52" fill="none" stroke="#9ab498" stroke-width="2"/>${[-20,3,24].map((a,i)=>`<g transform="translate(${a} ${-6-i%2*10})"><ellipse rx="13" ry="9" fill="#d7a35b" stroke="#af7942" stroke-width="1.5"/><g fill="#8b5a33"><circle cx="-4" cy="-3" r="2"/><circle cx="5" cy="2" r="2"/></g></g>`).join('')}<path d="M-29 21 0 36v19l-29-15Z" fill="#fff0b8"/><text x="-20" y="37" transform="rotate(29 -20 37)" font-size="9" font-weight="800" fill="#906f37">人氣餅乾</text></g>`;
}
