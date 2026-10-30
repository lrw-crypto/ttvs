/** Shared game rules. Storage is a convenience for progress, not an anti-cheat system. */
export const STORAGE_KEY = 'ttvs.moe-shop.game.v1';
export const REWARD_RECEIPT_KEY = 'ttvs.moe-shop.website-reward.v1';

export const SALES = Object.freeze([
  Object.freeze({ id: 'milk', name: '奶茶', price: 40, quantity: 6 }),
  Object.freeze({ id: 'cookie', name: '餅乾', price: 25, quantity: 8 }),
  Object.freeze({ id: 'juice', name: '果汁', price: 35, quantity: 4 }),
]);
export const TRAINING_ORDERS = Object.freeze([
  Object.freeze({ id: 'A101', customer: '小晴', product: '奶茶', quantity: 2 }),
  Object.freeze({ id: 'A102', customer: '阿哲', product: '餅乾', quantity: 1 }),
  Object.freeze({ id: 'A101', customer: '小晴', product: '奶茶', quantity: 2 }),
  Object.freeze({ id: 'A103', customer: '小晴', product: '果汁', quantity: 1 }),
]);
export const SERVICE_ORDERS = Object.freeze([
  Object.freeze({ id: 'T101', customer: '小晴', product: '冰奶茶', type: 'cold', quantity: 1 }),
  Object.freeze({ id: 'T102', customer: '阿哲', product: '熱可可', type: 'hot', quantity: 1 }),
  Object.freeze({ id: 'T103', customer: '小安', product: '冰果汁', type: 'cold', quantity: 1 }),
]);
export const FESTIVAL_ORDERS = Object.freeze([
  Object.freeze({ id: 'F201', customer: '小晴', product: '冰奶茶', type: 'cold', price: 40, quantity: 2 }),
  Object.freeze({ id: 'F202', customer: '阿哲', product: '熱可可', type: 'hot', price: 50, quantity: 1 }),
  Object.freeze({ id: 'F201', customer: '小晴', product: '冰奶茶', type: 'cold', price: 40, quantity: 2 }),
  Object.freeze({ id: 'F203', customer: '小安', product: '冰果汁', type: 'cold', price: 35, quantity: 1 }),
]);

export function defaultState() {
  return {
    version: 1, started: false, name: '萌萌校園店', avatar: 'mint',
    completed: [false, false, false], rewarded: [false, false, false],
    rules: { cold: null, hot: null }, stars: 0,
    unlocked: { sign: false, chair: false, plant: false },
    decor: { sign: 'mint', chair: 'cat', plant: 'flower' },
    finalComplete: false, websiteRewardHandled: false,
  };
}

function resolveStorage(storage) {
  try { return storage === undefined ? globalThis.localStorage : storage; }
  catch { return null; }
}

const choices = {
  sign: ['mint', 'pink'], chair: ['cat', 'bear'], plant: ['flower', 'cactus'],
};
const bool = value => value === true;

function sanitize(raw) {
  const state = defaultState();
  state.started = bool(raw.started);
  if (typeof raw.name === 'string') {
    state.name = Array.from(raw.name.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 12).join('') || state.name;
  }
  if (['mint', 'peach'].includes(raw.avatar)) state.avatar = raw.avatar;
  for (let index = 0; index < 3; index++) {
    // An existing completed task can never be claimed again on a later visit.
    state.completed[index] = bool(raw.completed?.[index]) || bool(raw.rewarded?.[index]);
    state.rewarded[index] = state.completed[index];
  }
  for (const type of ['cold', 'hot']) {
    state.rules[type] = ['cold', 'hot'].includes(raw.rules?.[type]) ? raw.rules[type] : null;
  }
  // Reconstruct the balance from receipts so damaged numeric fields cannot create negatives.
  state.stars = state.rewarded.filter(Boolean).length * 2;
  for (const group of Object.keys(choices)) {
    if (bool(raw.unlocked?.[group]) && state.stars >= 2) {
      state.unlocked[group] = true;
      state.stars -= 2;
    }
    if (state.unlocked[group] && choices[group].includes(raw.decor?.[group])) state.decor[group] = raw.decor[group];
  }
  state.finalComplete = bool(raw.finalComplete) && state.completed.every(Boolean);
  state.websiteRewardHandled = bool(raw.websiteRewardHandled);
  return state;
}

export function loadState(storage) {
  const target = resolveStorage(storage);
  const fallback = defaultState();
  if (!target) return { state: fallback, persistent: false, warning: '無法使用本機儲存，本次進度無法保存；仍可繼續遊玩。' };
  let state = fallback;
  let warning = '';
  try {
    const receipt = target.getItem(REWARD_RECEIPT_KEY) === 'handled';
    const serialized = target.getItem(STORAGE_KEY);
    if (serialized) {
      try {
        const raw = JSON.parse(serialized);
        if (!raw || typeof raw !== 'object' || raw.version !== 1) throw new Error('Unsupported save');
        state = sanitize(raw);
      } catch {
        warning = '存檔損壞或版本不相容，已安全開啟新遊戲。';
      }
    }
    state.websiteRewardHandled ||= receipt;
    // A readable store can still reject writes, e.g. private mode or exhausted quota.
    const probe = `${STORAGE_KEY}.probe`;
    const previous = target.getItem(probe);
    target.setItem(probe, '1');
    if (previous === null) target.removeItem(probe);
    else target.setItem(probe, previous);
    return { state, persistent: true, warning };
  } catch {
    return { state, persistent: false, warning: '無法使用本機儲存，本次進度無法保存；仍可繼續遊玩。' };
  }
}

export function saveState(state, storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    // Persist the separate reward receipt first; resetting game data never clears it.
    if (state.websiteRewardHandled) target.setItem(REWARD_RECEIPT_KEY, 'handled');
    target.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function completeTask(state, index) {
  if (!Number.isInteger(index) || index < 0 || index > 2) return { firstReward: false, stars: state.stars };
  state.completed[index] = true;
  const firstReward = !state.rewarded[index];
  if (firstReward) {
    state.rewarded[index] = true;
    state.stars += 2;
  }
  return { firstReward, stars: state.stars };
}

export function purchaseDecoration(state, group) {
  if (!Object.hasOwn(choices, group)) return { ok: false, message: '找不到這組裝飾。' };
  if (state.unlocked[group]) return { ok: true, message: '已解鎖，現在可以免費切換造型。' };
  if (state.stars < 2) return { ok: false, message: '星星不足，需要 2 顆。完成任務即可獲得，不影響通關！' };
  state.stars -= 2;
  state.unlocked[group] = true;
  return { ok: true, message: '裝飾已解鎖！組內兩種造型都可以免費切換。' };
}

export function isDuplicate(orders, index) {
  if (!Array.isArray(orders) || !Number.isInteger(index) || !orders[index]) return false;
  return orders.some((order, other) => other !== index && order.id === orders[index].id);
}

export function removeDuplicate(orders, index) {
  return isDuplicate(orders, index) ? orders.filter((_, other) => other !== index) : null;
}

export function runRules(orders, rules) {
  return orders.map(order => {
    const cup = ['cold', 'hot'].includes(order.type) ? rules?.[order.type] ?? null : null;
    return { ...order, cup, correct: cup !== null && cup === order.type };
  });
}

export function summarizeOrders(orders) {
  const lines = orders.map(order => {
    const price = Number.isFinite(order.price) && order.price >= 0 ? order.price : 0;
    const quantity = Number.isInteger(order.quantity) && order.quantity >= 0 ? order.quantity : 0;
    return { ...order, quantity, revenue: price * quantity };
  });
  return {
    orderCount: lines.length,
    cupCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.revenue, 0),
    lines,
  };
}

export function finishFestival(state, orders) {
  const expected = FESTIVAL_ORDERS.filter((order, index, all) => all.findIndex(other => other.id === order.id) === index);
  const exactOrders = Array.isArray(orders) && orders.length === expected.length && expected.every(order => {
    const matches = orders.filter(candidate => candidate.id === order.id);
    return matches.length === 1 && Object.keys(order).every(key => matches[0][key] === order[key]);
  });
  if (!state.completed.every(Boolean) || !exactOrders || !runRules(orders, state.rules).every(result => result.correct)) return false;
  state.finalComplete = true;
  return true;
}
