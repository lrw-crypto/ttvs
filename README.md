# 資處萌萌店長

用資訊小技能，開一間智慧小店！這是 `lrw-crypto/ttvs` 的獨立靜態遊戲，使用原生 JavaScript ES modules、CSS 與原創 SVG，沒有登入、付費服務或後端需求。

## 本機預覽

需要 Python 3；Node.js 20 以上可執行測試。

```sh
cd /workspace/ttvs
npm run dev
```

瀏覽 `http://localhost:5173`。首頁按「開始經營｜資處萌萌店長」，輸入店名並選店長。遊戲直接使用原始碼執行，沒有建置步驟；只預覽遊戲不需要安裝 npm 套件。

直接進入店面的本機路徑為 `http://localhost:5173/#shop`；第一次會顯示店名及角色設定，之後顯示已保存的店面。首頁另有「直接進入店面」連結。

目前視覺使用原創的花園咖啡小店：暖色磁磚、L 形木質櫃檯、飲品設備、花牆、圍欄、顧客及大圖示按鈕。手機會放大店內區域，三項設備仍各有至少 44px 的可存取操作按鈕。參考圖僅用來理解經營遊戲的場景層次，沒有使用其商標、人物或介面素材。

## 玩法

1. 訂單整理員：拖曳或點選配對四個欄位，從 A101 重複訂單中移除一筆，升級電子訂單機。
2. 自動服務工程師：為冷／熱分支選杯，試跑三筆真實訂單。錯誤不扣分，修正後再試。升級助手工作站。
3. 銷售分析師：用積木組成營收公式，套用整欄，再比較銷量與營收圖，解鎖分析看板和餅乾展示櫃。
4. 校慶開幕日：去除 F201 重複訂單，沿用助手規則完成出餐，結算 3 筆、4 杯、165 元，取得紀念徽章。

三項任務首次完成各得 2 顆裝飾星星。招牌、椅子、盆栽各用 2 顆解鎖整組，解鎖後免費切換。購買前可預覽；不買裝飾也能通關。設備由任務自動升級。

進度使用獨立命名空間 `ttvs.moe-shop.game.v1` 儲存在目前瀏覽器。重玩只重開當次短任務，不清除其他進度，也不重發星星。儲存失效時仍可遊玩並顯示提醒。這是本機進度儲存，不是防作弊或跨裝置帳號系統。沒有會清除全站 localStorage 的功能。

## 檔案

- `index.html`：獨立首頁入口，所有資源使用相對路徑。
- `src/app.js`：首頁、任務操作、焦點管理、觸控與滑鼠拖曳、動畫生命週期。
- `src/game.js`：訂單去重、規則執行、營收計算、任務獎勵與版本化存檔。
- `src/scene.js` / `src/shop-world.js` / `src/scene.css`：原創等角小店、花園家具、角色、設備、裝飾、出餐動畫。
- `src/style.css` / `src/game-theme.css`：本遊戲範圍內的介面樣式、木質遊戲介面及行動裝置排版。
- `src/integration.js`：未啟用的校園網站獎勵轉接介面。
- `scripts/build.mjs`：只將網站需要的靜態檔案整理至 `dist/`，不會上傳。
- `.github/workflows/pages.yml`：推送 `main` 後會先測試、建置，再自動部署 GitHub Pages；亦可手動重跑。
- `tests/`：邏輯與瀏覽器測試。

## 測試

```sh
npm ci
npm test
```

端對端測試使用 Playwright 及本機 Chromium，測試會自行啟動本機靜態伺服器：

```sh
npm run test:browser
```

驗證實際的靜態輸出（含 `/ttvs/`、`/115/` 子路徑與 `#shop` 直接入口）：

```sh
npm run build
SITE_DIR=dist npm run test:browser
```

預設瀏覽器路徑為 `/usr/bin/chromium`，可用 `CHROMIUM_PATH` 指定。測試產生的畫面保存在已忽略的 `test-results/`，不屬於網站資源。測試含手機與平板尺寸模擬；這不等於 iPad 實機 Safari 測試。

## 與原校園網站的關係

本倉庫起始為空，沒有既有地圖、科別頁面、金幣或兌獎系統。因此本版的「返回首頁／返回資處科首頁」會回到獨立遊戲首頁，沒有虛構校園連結、增加全站金幣或改動兌獎門檻。

未來若要整合，請由校園網站在載入遊戲模組前，提供現有科別的真實識別碼及防重複發獎函式：

```js
window.TTVSCampusBridge = {
  departmentId: '由校園網站提供的既有資處科識別碼',
  async awardDepartment({ departmentId, completionId, badge }) {
    // 呼叫校園網站原有且具冪等性的通關 API。
    // completionId 固定為 ttvs.moe-shop.festival.v1。
    // 只有確認「已發放」或「先前已處理」才回傳：
    return { handled: true };
  },
};
```

目前沒有安裝此轉接器，遊戲不會宣稱已發全站金幣。轉接器成功回覆後，遊戲才寫入 `websiteRewardHandled` 及獨立的 `ttvs.moe-shop.website-reward.v1` 收據。失敗會保留待處理狀態，可於重新載入或再次完成校慶時重試。校園網站仍須用自己原有的科別防重複機制驗證與發獎；localStorage 收據不能取代正式驗證或實體兌獎流程。

## GitHub Pages

**發布雲端環境，和把網站部署到 GitHub Pages，是兩個不同的操作。** 環境發布會保存開發機的檔案，不會自動建立 Git 提交、推送到 GitHub 或更新公開網站。

對這個倉庫，使用 GitHub Pages 的預設網域且完成部署後，預期網址為：

- 遊戲首頁：`https://lrw-crypto.github.io/ttvs/`
- 直接進入店面：`https://lrw-crypto.github.io/ttvs/#shop`

正式上線狀態請以 GitHub Actions 的部署結果及公開頁面驗證為準。若開發環境代理因網路政策回覆 403，這不是網站本身的 HTTP 狀態；發布及驗證需允許 `api.github.com` 和 `lrw-crypto.github.io`。

使用者已授權發布目前版本，並要求之後的修改在驗證後直接發布。請沿用以下流程，不必為每次修改重複要求發布授權；如使用者提出新的限制，以最新指示為準：

1. 完成修改後執行適當測試及 `npm run build`；涉及遊戲操作時，執行 `SITE_DIR=dist npm run test:browser`。
2. 確認遠端最新提交並保留其他人的工作，將通過驗證的修改提交、推送到 `main`，不使用強制推送。
3. 推送會自動觸發 `Publish game to GitHub Pages`，先跑邏輯測試、整理靜態輸出，再部署。需要重試時可在 Actions 手動執行同一流程。
4. 首次設定需在倉庫 Settings → Pages 將 Source 設為 GitHub Actions，或使用具權限的 GitHub Pages API 啟用。
5. 等待工作流程成功，再以實際回傳的 `page_url` 驗證首頁、`#shop`、程式與素材，才宣告正式網址可玩。若外部權限或網路政策阻擋，回報具體阻礙，不能將推送成功當作部署成功。

`npm run build` 只整理 `index.html`、`src/`、`assets/` 及 `.nojekyll` 至 `dist/`，不包含測試檔、開發套件、Git 資料或存檔。全部程式、樣式及圖示都使用相對網址，無路由伺服器需求，可放在 `/ttvs/`、`/115/` 或其他子路徑。沒有外部字型或圖片請求。

所有插畫均由程式中的原創 SVG 繪製；第一版不需補圖或音效。本版沒有音訊播放。徽章僅為遊戲完成紀念，不代表正式證照。
