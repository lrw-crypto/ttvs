import test from 'node:test';
import assert from 'node:assert/strict';
import { processCampusReward } from '../src/integration.js';
import {
  STORAGE_KEY, REWARD_RECEIPT_KEY, defaultState, loadState, saveState,
  completeTask, purchaseDecoration, isDuplicate, removeDuplicate,
  runRules, summarizeOrders, finishFestival, SALES, TRAINING_ORDERS,
  SERVICE_ORDERS, FESTIVAL_ORDERS,
} from '../src/game.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('standalone completion never pretends a campus reward was processed', async () => {
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    const state = defaultState();
    state.finalComplete = true;
    let writes = 0;
    await processCampusReward(state, () => writes++);
    assert.equal(state.websiteRewardHandled, false);
    assert.equal(writes, 0);
  } finally { globalThis.window = previous; }
});

test('campus adapter requires acknowledgement, retries failures, and deduplicates concurrent calls', async () => {
  const previous = globalThis.window;
  const state = defaultState();
  state.finalComplete = true;
  let calls = 0;
  let writes = 0;
  globalThis.window = { TTVSCampusBridge: {
    departmentId: 'existing-host-department',
    async awardDepartment(payload) {
      calls++;
      assert.equal(payload.departmentId, 'existing-host-department');
      assert.equal(payload.completionId, 'ttvs.moe-shop.festival.v1');
      if (calls === 1) throw new Error('Temporary host failure');
      await new Promise(resolve => setTimeout(resolve, 5));
      return { handled: true };
    },
  } };
  try {
    await processCampusReward(state, () => writes++);
    assert.equal(state.websiteRewardHandled, false);
    await Promise.all([processCampusReward(state, () => writes++), processCampusReward(state, () => writes++)]);
    await processCampusReward(state, () => writes++);
    assert.equal(calls, 2);
    assert.equal(writes, 1);
    assert.equal(state.websiteRewardHandled, true);
  } finally { globalThis.window = previous; }
});

test('either A101 duplicate can be removed, but A102/A103 and the last A101 are protected', () => {
  for (const index of [0, 2]) {
    const cleaned = removeDuplicate(TRAINING_ORDERS, index);
    assert.equal(cleaned.length, 3);
    assert.equal(cleaned.filter(order => order.id === 'A101').length, 1);
    assert.deepEqual(cleaned.map(order => order.id).sort(), ['A101', 'A102', 'A103']);
    assert.equal(removeDuplicate(cleaned, cleaned.findIndex(order => order.id === 'A101')), null);
  }
  assert.equal(removeDuplicate(TRAINING_ORDERS, 1), null);
  assert.equal(removeDuplicate(TRAINING_ORDERS, 3), null);
  assert.equal(isDuplicate(TRAINING_ORDERS, 99), false);
  assert.equal(TRAINING_ORDERS.length, 4);
});

test('service execution follows actual configured branches including duplicated cup choices', () => {
  const empty = runRules(SERVICE_ORDERS, { cold: null, hot: null });
  assert.equal(empty.filter(result => result.correct).length, 0);
  const bothCold = runRules(SERVICE_ORDERS, { cold: 'cold', hot: 'cold' });
  assert.deepEqual(bothCold.map(result => result.correct), [true, false, true]);
  assert.equal(bothCold[1].cup, 'cold');
  const corrected = runRules(SERVICE_ORDERS, { cold: 'cold', hot: 'hot' });
  assert.ok(corrected.every(result => result.correct));
  assert.equal(runRules(SERVICE_ORDERS, { cold: 'hot', hot: 'cold' }).filter(result => result.correct).length, 0);
});

test('spreadsheet revenues and bestsellers are independently calculated', () => {
  const summary = summarizeOrders(SALES);
  assert.deepEqual(summary.lines.map(line => line.revenue), [240, 200, 140]);
  assert.equal(summary.total, 580);
  assert.equal([...SALES].sort((a, b) => b.quantity - a.quantity)[0].name, '餅乾');
  assert.equal([...summary.lines].sort((a, b) => b.revenue - a.revenue)[0].name, '奶茶');
});

test('festival excludes duplicate revenue and distinguishes order count from cup count', () => {
  const cleaned = removeDuplicate(FESTIVAL_ORDERS, 2);
  const summary = summarizeOrders(cleaned);
  assert.equal(summary.orderCount, 3);
  assert.equal(summary.cupCount, 4);
  assert.equal(summary.total, 165);
  assert.deepEqual(summary.lines.map(line => line.revenue), [80, 50, 35]);
});

test('festival only completes with all tasks, valid deduplication and successful saved rules', () => {
  const state = defaultState();
  const orders = removeDuplicate(FESTIVAL_ORDERS, 0);
  assert.equal(finishFestival(state, orders), false);
  for (let i = 0; i < 3; i++) completeTask(state, i);
  assert.equal(finishFestival(state, orders), false);
  state.rules = { cold: 'cold', hot: 'hot' };
  assert.equal(finishFestival(state, FESTIVAL_ORDERS), false);
  assert.equal(finishFestival(state, orders.slice(0, 2)), false);
  assert.equal(finishFestival(state, orders.map(order => ({ ...order, price: 1 }))), false);
  assert.equal(finishFestival(state, orders), true);
  assert.equal(state.finalComplete, true);
});

test('task rewards and decoration purchases cannot be claimed twice, including after reload', () => {
  const state = defaultState();
  const storage = memoryStorage();
  assert.equal(purchaseDecoration(state, 'chair').ok, false);
  assert.equal(state.stars, 0);
  assert.equal(completeTask(state, 0).firstReward, true);
  assert.equal(completeTask(state, 0).firstReward, false);
  assert.equal(state.stars, 2);
  assert.equal(purchaseDecoration(state, 'chair').ok, true);
  assert.equal(purchaseDecoration(state, 'chair').ok, true);
  assert.equal(state.stars, 0);
  state.decor.chair = 'bear';
  assert.equal(saveState(state, storage), true);
  const restored = loadState(storage).state;
  assert.equal(restored.decor.chair, 'bear');
  assert.equal(completeTask(restored, 0).firstReward, false);
  assert.equal(purchaseDecoration(restored, 'chair').ok, true);
  assert.equal(restored.stars, 0);
  assert.deepEqual(restored.completed, [true, false, false]);
});

test('corrupt and incompatible saves recover safely, preserving independent website receipt', () => {
  const storage = memoryStorage();
  storage.setItem(REWARD_RECEIPT_KEY, 'handled');
  for (const bad of ['{broken', '{"version":99}', 'null']) {
    storage.setItem(STORAGE_KEY, bad);
    const loaded = loadState(storage);
    assert.equal(loaded.persistent, true);
    assert.ok(loaded.warning);
    assert.equal(loaded.state.websiteRewardHandled, true);
    assert.deepEqual(loaded.state.completed, [false, false, false]);
  }
});

test('malformed supported saves constrain names, choices and star balances', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1, name: '超級超級超級超級超級超級超級長店名', avatar: '__proto__',
    completed: [true, false, false], rewarded: [], stars: -100,
    rules: { cold: 'magic', hot: 'hot' },
    unlocked: { sign: true, chair: true, plant: true },
    decor: { sign: 'pink', chair: 'invalid' }, finalComplete: true,
  }));
  const state = loadState(storage).state;
  assert.equal(Array.from(state.name).length, 12);
  assert.equal(state.avatar, 'mint');
  assert.equal(state.stars, 0);
  assert.equal(state.unlocked.sign, true);
  assert.equal(state.unlocked.chair, false);
  assert.equal(state.decor.sign, 'pink');
  assert.equal(state.rules.cold, null);
  assert.equal(state.finalComplete, false);
  assert.equal(completeTask(state, 0).firstReward, false);
});

test('unavailable or quota-exhausted storage does not stop play', () => {
  assert.equal(loadState(null).persistent, false);
  assert.equal(saveState(defaultState(), null), false);
  const blocked = { getItem: () => null, setItem() { throw new Error('quota'); } };
  const loaded = loadState(blocked);
  assert.equal(loaded.persistent, false);
  assert.ok(loaded.warning.includes('仍可'));
  completeTask(loaded.state, 0);
  assert.equal(loaded.state.stars, 2);
  assert.equal(saveState(loaded.state, blocked), false);
});

test('saving game state never clears an existing website reward receipt', () => {
  const storage = memoryStorage();
  const state = defaultState();
  state.websiteRewardHandled = true;
  assert.equal(saveState(state, storage), true);
  assert.equal(storage.getItem(REWARD_RECEIPT_KEY), 'handled');
  saveState(defaultState(), storage);
  assert.equal(loadState(storage).state.websiteRewardHandled, true);
});
