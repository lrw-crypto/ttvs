import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTS,BOSS,CAMP,ROAD,RPG_KEY,findPath,passable,canEnter,experience,heroLevel,loadRpg,saveRpg,nearestNPC} from '../src/rpg.js';
import {defaultState,completeTask,loadState,saveState} from '../src/game.js';

test('every NPC has a continuous road-only path from camp; no steps cross buildings or water',()=>{
  for(const target of [...QUESTS.map(q=>q.pos),BOSS]){
    const path=findPath(CAMP,target);assert.ok(path.length>0);
    let previous=CAMP;
    for(const p of path){assert.equal(Math.abs(p.x-previous.x)+Math.abs(p.y-previous.y),1);assert.equal(passable(p.x,p.y),true);previous=p;}
    assert.deepEqual(path.at(-1),target);
  }
  assert.deepEqual(findPath(CAMP,{x:0,y:0}),[]);
  assert.deepEqual(findPath(CAMP,CAMP),[]);
  assert.equal(passable(19,2),false);assert.ok(ROAD.length>20);
});
test('quest gates require earlier skills and the boss requires all three runes',()=>{
  const done=[false,false,false];assert.equal(canEnter(done,0),true);
  for(const i of [1,2,3])assert.equal(canEnter(done,i),false);
  done[0]=true;assert.equal(canEnter(done,1),true);assert.equal(canEnter(done,2),false);
  done[1]=true;assert.equal(canEnter(done,2),true);assert.equal(canEnter(done,3),false);
  done[2]=true;assert.equal(canEnter(done,3),true);
});
test('RPG experience follows existing receipts; repeating tasks does not farm XP or stars',()=>{
  const state=defaultState();assert.equal(heroLevel(state),1);
  for(let i=0;i<3;i++){completeTask(state,i);completeTask(state,i);}
  assert.equal(experience(state),75);assert.equal(state.stars,6);
  state.finalComplete=true;assert.equal(experience(state),125);assert.equal(heroLevel(state),5);
  completeTask(state,0);assert.equal(experience(state),125);assert.equal(state.stars,6);
});
test('RPG position storage is namespaced and safely recovers invalid locations and bad JSON',()=>{
  const map=new Map([['unrelated-site-save','preserve-me']]);
  const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const rpg={version:1,introduced:true,hero:{...QUESTS[1].pos}};
  assert.equal(saveRpg(rpg,storage),true);assert.deepEqual(loadRpg(storage).rpg,rpg);
  map.set(RPG_KEY,JSON.stringify({...rpg,hero:{x:0,y:0}}));assert.deepEqual(loadRpg(storage).rpg.hero,CAMP);
  map.set(RPG_KEY,'broken');assert.deepEqual(loadRpg(storage).rpg.hero,CAMP);assert.equal(loadRpg(storage).persistent,true);
  assert.equal(map.get('unrelated-site-save'),'preserve-me');
  assert.equal(loadRpg({getItem(){throw Error('Denied');}}).persistent,false);
});
test('legacy completed lessons remain completed, and course records name the actual learning domains',()=>{
  const old=defaultState();old.name='舊玩家';old.completed=[true,true,false];old.rewarded=[true,true,false];old.stars=4;
  const map=new Map();const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  saveState(old,storage);saveRpg({version:1,introduced:true,hero:{...CAMP}},storage);
  const restored=loadState(storage).state;assert.deepEqual(restored.completed,[true,true,false]);assert.equal(restored.stars,4);
  assert.equal(experience(restored),50);
  assert.match(QUESTS[0].course,/資料庫/);assert.match(QUESTS[1].course,/程式設計/);assert.match(QUESTS[2].course,/試算表/);
  assert.equal(nearestNPC(QUESTS[0].pos),0);assert.equal(nearestNPC(CAMP),-1);
});
