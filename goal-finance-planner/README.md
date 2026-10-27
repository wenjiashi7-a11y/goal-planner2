# 目標理財規劃

依理財目標(退休、購屋頭期款、子女教育、緊急預備金、自訂)進行試算的純前端網站。
核心是三個財務函數:

| 函數 | 用途 |
| --- | --- |
| PMT | 已知目標與時間,算每月要存多少 |
| PV | 已知每月存款,算現在要準備多少本金 |
| FV | 已知本金與存款,算到期能累積多少 |

報酬率採固定年化、月複利(年利率 ÷ 12),與 Excel 的 PMT、PV、FV 函數算法一致。
本工具僅供試算,不保證任何投資結果,也不構成投資或稅務建議。

## 專案結構

```
public/          網站內容(Cloudflare Pages 的輸出資料夾)
  index.html
  style.css
  app.js         計算邏輯在 <calc> 標記區塊內
  _headers       Cloudflare Pages 的標頭設定
tests/calc.test.js   計算驗算測試
wrangler.toml    Cloudflare Pages 設定
```

沒有 build 步驟,也沒有第三方套件。

## 本機執行

```bash
npm test          # 驗算 PMT / PV / FV
npm run dev       # 用 wrangler 在本機預覽
# 或直接用任何靜態伺服器,例如:
python3 -m http.server --directory public 8080
```

## 上傳到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<你的帳號>/goal-finance-planner.git
git push -u origin main
```

## 部署到 Cloudflare Pages

### 方式一:連結 GitHub(之後推送就自動部署)

1. Cloudflare 後台進入 Workers & Pages,選 Create application,再選 Pages,然後 Connect to Git。
2. 選擇這個 repository。
3. 設定:
   - Framework preset:None
   - Build command:留空
   - Build output directory:`public`
4. 按 Save and Deploy。

### 方式二:命令列直接上傳

```bash
npx wrangler login
npm run deploy
```

## 字型

字型(Noto Serif TC、Noto Sans TC、IBM Plex Mono)從 Google Fonts 載入。
若網路擋掉 Google,頁面會改用系統字型,功能不受影響。
