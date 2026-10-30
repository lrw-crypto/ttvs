// Optional host adapter. Standalone play never invents or changes campus coins.
let inFlight = false;
export async function processCampusReward(state, persist) {
  if (!state.finalComplete || state.websiteRewardHandled || inFlight) return;
  const bridge = window.TTVSCampusBridge;
  if (!bridge || typeof bridge.awardDepartment !== 'function' || !bridge.departmentId) return;
  inFlight = true;
  try {
    const result = await bridge.awardDepartment({
      departmentId: bridge.departmentId,
      completionId: 'ttvs.moe-shop.festival.v1',
      badge: '資處資料勇者',
    });
    if (result?.handled === true) {
      state.websiteRewardHandled = true;
      persist();
    }
  } catch {
    // Keep receipt pending; host must deduplicate completionId when retrying.
  } finally {
    inFlight = false;
  }
}
