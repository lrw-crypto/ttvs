/** RPG progression shares the existing task receipts; no old stars or website rewards are reset. */
export const RPG_KEY = 'ttvs.data-quest.rpg.v1';
export const TILE = 40;
export const CAMP = Object.freeze({ x: 10, y: 13 });
export const QUESTS = Object.freeze([
  { name:'失序的檔案館', npc:'索引學者・小序', place:'資料檔案館', course:'資料整理與資料庫入門', rune:'秩序符文', pos:{x:4,y:10}, color:'mint',
    brief:'雜訊把校慶訂單打散，還複製了同一筆紀錄。把欄位和紀錄整理好，取回秩序符文！',
    task:'建立資料表，移除重複紀錄', skill:'資料表、欄位、紀錄、識別碼',
    learned:'你把資料放進不同欄位，再用訂單編號辨認紀錄。這就是資料整理，以及建立可靠資料表的第一步。',
    reality:'學生名冊、商品庫存與訂單系統，都需要清楚的欄位與不重複的紀錄。', practical:'整理一份社團報名表，找出重複報名資料。' },
  { name:'迷路的機器守衛', npc:'程式工程師・阿布', place:'程式工坊', course:'程式設計與邏輯', rune:'邏輯符文', pos:{x:16,y:10}, color:'peach',
    brief:'守衛只會照規則做事，冷熱飲卻一直送錯！替它寫出條件分支，再用三筆資料測試。',
    task:'組合 if / else 規則，測試與除錯', skill:'輸入、條件判斷、分支、測試除錯',
    learned:'你設定「如果…否則…」，用不同輸入觀察結果，再修正規則。這就是程式設計中的條件判斷和除錯。',
    reality:'自動分類、會員折扣與出餐系統，都能依條件執行不同動作。', practical:'讓程式依會員身分決定是否套用折扣。' },
  { name:'數字迷霧的真相', npc:'圖表研究員・小析', place:'試算表分析塔', course:'試算表應用與資料分析', rune:'洞察符文', pos:{x:4,y:5}, color:'mint',
    brief:'迷霧說「賣最多的一定營收最高」。先用公式算出營收，再比較兩種圖表，拆穿它！',
    task:'組合公式，切換圖表並做決策', skill:'儲存格、乘法公式、套用整欄、圖表指標',
    learned:'你用單價 × 銷量計算營收，並分別看銷量與營收圖。這就是試算表計算與資料判讀。營收尚未扣除成本。',
    reality:'班費收支、校慶銷售與社團預算，都能用試算表整理、計算和比較。', practical:'做一張校慶銷售表，找出銷量王與營收王。' },
]);
export const BOSS = Object.freeze({x:15,y:5});
const road = new Set();
function line(x1,y1,x2,y2) {
  const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);
  for(let x=x1,y=y1;;x+=dx,y+=dy){road.add(`${x},${y}`);if(x===x2&&y===y2)break;}
}
line(4,12,16,12);line(10,6,10,13);line(4,5,4,12);line(16,10,16,12);line(10,6,15,6);line(15,5,15,6);
export const ROAD = Object.freeze([...road].map(s=>{const [x,y]=s.split(',').map(Number);return {x,y};}));
export const passable = (x,y) => Number.isInteger(x)&&Number.isInteger(y)&&road.has(`${x},${y}`);
export const canEnter = (completed,index) => index===0 || index<3&&completed[index-1]===true || index===3&&completed.every(Boolean);
export const experience = state => state.completed.filter(Boolean).length*25 + (state.finalComplete?50:0);
export const heroLevel = state => Math.min(5,1+Math.floor(experience(state)/25));

export function findPath(from,to) {
  if(!passable(from.x,from.y)||!passable(to.x,to.y))return [];
  const queue=[[from]],seen=new Set([`${from.x},${from.y}`]);
  for(let i=0;i<queue.length;i++){
    const path=queue[i],p=path.at(-1);
    if(p.x===to.x&&p.y===to.y)return path.slice(1);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const next={x:p.x+dx,y:p.y+dy},key=`${next.x},${next.y}`;
      if(passable(next.x,next.y)&&!seen.has(key)){seen.add(key);queue.push([...path,next]);}
    }
  }
  return [];
}
export function nearestNPC(hero) {
  const index=[...QUESTS.map(q=>q.pos),BOSS].findIndex(p=>Math.abs(p.x-hero.x)+Math.abs(p.y-hero.y)<=1);
  return index;
}
export function loadRpg(storage) {
  const fallback={version:1,introduced:false,hero:{...CAMP}};
  try {
    const target=storage===undefined?globalThis.localStorage:storage;
    if(!target)return {rpg:fallback,persistent:false};
    const serialized=target.getItem(RPG_KEY);
    let raw;
    try {raw=JSON.parse(serialized||'null');}catch{return {rpg:fallback,persistent:true};}
    if(!raw||raw.version!==1)return {rpg:fallback,persistent:true};
    return {rpg:{version:1,introduced:raw.introduced===true,hero:passable(raw.hero?.x,raw.hero?.y)?{x:raw.hero.x,y:raw.hero.y}:{...CAMP}},persistent:true};
  } catch {return {rpg:fallback,persistent:false};}
}
export function saveRpg(rpg,storage) {
  try {const target=storage===undefined?globalThis.localStorage:storage;target.setItem(RPG_KEY,JSON.stringify(rpg));return true;}catch{return false;}
}
