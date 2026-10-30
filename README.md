# 資處萌萌冒險：資料迷霧之島

資料處理科課程探索 RPG。玩家扮演資訊見習生，沿地圖石板路尋找 NPC，完成實作解謎，收集知識符文，最後修復被雜訊干擾的校慶系統。

## 遊戲網址

- 首頁：https://lrw-crypto.github.io/ttvs/
- 直接進入冒險地圖：https://lrw-crypto.github.io/ttvs/#shop

`#shop` 保留舊入口相容性，現在會進入 RPG 地圖。正式上線版本以 GitHub 原生 `pages build and deployment` 及後續 `Verify published RPG` 的公開內容驗證成功為準。

## 如何玩

1. 輸入冒險者名字，選擇薄荷／蜜桃角色。點選據點，角色會自動沿路走到 NPC；也可在地圖按方向鍵、WASD，或使用畫面方向按鈕，走近後對話。
2. **失序的檔案館 → 資料整理與資料庫入門**：建立欄位、配對紀錄，用識別碼移除重複訂單。取得秩序符文。
3. **迷路的機器守衛 → 程式設計與邏輯**：建立 if / else 條件分支，試跑三種輸入，修改錯誤規則。取得邏輯符文。
4. **數字迷霧的真相 → 試算表應用與資料分析**：組合公式、套用整欄，切換銷量與營收圖做判斷。取得洞察符文。
5. 三枚符文解除**雜訊核心**封印。綜合運用資料去重、程式執行與計算，修復校慶系統；正確結果為 3 筆、4 杯、165 元。
6. 每關成功都會明確解說「剛才的操作 → 資處學習領域 → 生活用途」，收入**課程圖鑑**。最後取得「資處資料勇者」遊戲紀念徽章。

這是常見學習領域的入門體驗，不宣稱特定學校的正式課程名稱、年級必修、軟體品牌或專業證照。正式課程以學校公告為準。沒有登入、體力、等待生產或付費功能。

## 進度與獎勵

保留第一版已完成的任務、裝飾與防重複獎勵紀錄，既有玩家不會被清空。

- 原任務狀態：`ttvs.moe-shop.game.v1`。
- RPG 位置與開場紀錄：`ttvs.data-quest.rpg.v1`。
- 課程圖鑑依已完成任務顯示；經驗值由通關狀態計算，重玩不會刷經驗。
- 三個核心任務首次完成各得 2 顆探險星，可用在營地屋頂、椅子與盆栽；每組 2 顆，解鎖後免費切換。
- 不購買裝飾也能通關。損壞存檔安全降級，儲存失效時仍可遊玩並顯示提醒。

localStorage 是本機進度儲存，不是防作弊或跨裝置帳號系統。遊戲不清除其他網站資料。

## 本機開發與測試

需要 Node.js 20 以上、Python 3。遊戲本身沒有 runtime 套件。

```sh
npm ci
npm run dev
```

瀏覽 `http://localhost:5173` 或 `http://localhost:5173/#shop`。

```sh
npm test
npm run build
SITE_DIR=dist npm run test:browser
```

瀏覽器測試用 Playwright、自行啟動的本機靜態伺服器及 `/usr/bin/chromium`；可透過 `CHROMIUM_PATH` 指定瀏覽器。包含桌面、390px 觸控、768／1024／1440 模擬尺寸、鍵盤、道路碰撞、NPC、封印、三關與最終挑戰、公式、圖鑑、存檔與獎勵防重複。模擬不等於實機 iPad／Safari 測試。

## 發布流程

使用者已授權目前及後續要求的修改在通過驗證後直接發布，不需重複要求發布授權；若有新的限制，依最新指示。

網站使用已啟用的 **`gh-pages` 分支原生 Pages 發布**。首次推送靜態 `gh-pages` 分支已成功觸發 GitHub 原生部署；不依賴開發環境呼叫被網路政策阻擋的 Pages 啟用 API。

完成修改後：

1. 執行適當測試、建置、必要的瀏覽器流程。
2. 檢查遠端，將通過驗證的程式提交並正常推送到 `main`，不強制覆蓋別人的提交。
3. 執行 `npm run deploy`。腳本檢查工作區乾淨、本機與遠端 main 一致，以暫存目錄更新既有 `gh-pages` 的靜態檔案並正常推送，不使用 force-push。
4. 等待 GitHub 原生 `pages build and deployment` 成功。同次靜態分支推送也會觸發 `Verify published RPG`，等待 Pages 完成後驗證：對公開網址取回 HTML、JavaScript、樣式及圖示，與這次發布的 SHA-256 指紋逐一比較。
5. 兩個工作都成功後，才宣告該版已上線。推送成功不能替代網站驗證成功。

`npm run build` 只產生 `dist/`：包含網站入口、runtime 原始碼／樣式、原創素材、`.nojekyll` 與 `release.json`。另含隱藏的 `.github/` 公開驗證工作流程工具；不含 Git metadata、開發套件、測試、認證或存檔。`release.json` 記錄來源提交與公開檔案指紋。建置會為入口資源及 ES module 加上來源版本號，避免更新後仍載入舊版程式。全站使用相對網址，支援 `/ttvs/`、`/115/` 子路徑。

發布雲端開發環境只會保存開發快照，和把網站部署到 GitHub Pages 是不同操作。

## 檔案

- `src/app.js`：角色、劇情、NPC 對話、任務、圖鑑、移動與可存取操作。
- `src/rpg.js`：課程對照、據點、道路、尋路、封印、經驗與 RPG 存檔。
- `src/adventure-world.js` / `src/rpg.css`：原創地圖、冒險者、NPC、建築、符文與 RPG 介面。
- `src/game.js`：共用去重、規則執行、營收、首次獎勵與舊存檔。
- `src/scene.js` / `src/shop-world.js` / 既有樣式：保留第一版原創場景模組，其中助手仍用於程式試跑；不載入外部美術。
- `scripts/`：靜態建置、正常分支發布、公開檔案指紋驗證。
- `tests/`：邏輯與實際瀏覽器驗收。

## 校園網站整合

本倉庫沒有全站金幣或實體兌獎機制，不虛構發獎。未來由既有網站在載入遊戲前提供：

```js
window.TTVSCampusBridge = {
  departmentId: '原網站既有的資處科唯一識別碼',
  async awardDepartment({ departmentId, completionId, badge }) {
    // 使用既有、具防重複機制的 API 發獎，成功或先前已處理才回覆：
    return { handled: true };
  },
};
```

固定 `completionId` 沿用 `ttvs.moe-shop.festival.v1`，避免從第一版升級後重複領取。只有真實回執才寫入 `websiteRewardHandled` 及獨立收據 `ttvs.moe-shop.website-reward.v1`；未接入不會宣稱有全站金幣。正式兌獎仍由原網站驗證。
