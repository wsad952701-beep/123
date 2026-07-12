# 順記燒臘館 · LINE 登入設定說明

## 只需要填入一個設定：LIFF ID

### 步驟（約 10 分鐘，免費）

**第一步：建立 LINE Login Channel**

1. 電腦打開 https://developers.line.biz
2. 右上角「Log in」→ 用你的 LINE 帳號登入
3. 點「Providers」→「Create a new provider」
   → Provider name 填「順記燒臘館」→ Create
4. 點「Create a new channel」→ 選「LINE Login」
   → Channel name：順記燒臘館
   → Channel description：點餐系統
   → App type：勾「Web app」
   → Email：填你的 email
   → 勾同意條款 → Create

**第二步：建立 LIFF App**

5. 進入剛建立的 Channel → 點上方「LIFF」標籤 → 點「Add」
6. 填入：
   - LIFF app name：點餐
   - **Size：Full（一定要選 Full）**
   - **Endpoint URL：你的 GitHub Pages 完整網址**
     - 找你的網址：去 GitHub → 倉庫 → Settings → Pages
     - 例如：https://wsad952701-beep.github.io/12/
     - 結尾一定要有斜線 /
   - Scope：勾選 「profile」和「openid」
   - Bot link feature：Off
7. 點「Add」建立
8. 複製畫面顯示的 **LIFF ID**（格式：1234567890-AbCdEfGh）

**第三步：填入 index.html**

9. 用記事本開啟 index.html
10. 按 Ctrl+F 搜尋：`LIFF_ID = ''`
11. 找到這行：
    ```
    var LIFF_ID = '';
    ```
    改成（把你的 LIFF ID 填進去）：
    ```
    var LIFF_ID = '1234567890-AbCdEfGh';
    ```
12. 儲存檔案

**第四步：上傳到 GitHub**

13. 去 GitHub 倉庫 → 點 index.html → 右上角鉛筆 Edit
    或直接把新的 index.html 拖到 GitHub 上傳覆蓋

等約 1 分鐘後，用手機打開網站測試：
→ 會出現「LINE 帳號登入」畫面
→ 點按鈕 → 跳到 LINE 授權 → 同意
→ 跳回網站 → 自動登入完成 → 可以點餐

---

## 登入後的效果

- 顯示名稱自動填入訂單「聯絡人」欄位
- 標頭右側顯示 LINE 大頭貼 + 名字
- 點大頭貼可以登出
- 登入狀態記住 14 天（下次打開不用重新登入）

---

## 常見問題

**Q：點登入後一直轉圈，回不來**
→ Endpoint URL 與實際網址不符。最常見的問題：
  1. 結尾沒有斜線 /
  2. 網址是 http 但填的是 https（或相反）
  3. 倉庫改名了但 LIFF 沒有更新

**Q：出現「LIFF 初始化失敗」**
→ LIFF ID 填錯了，或 Endpoint URL 不對

**Q：手機打開後沒有跳到 LINE 登入**
→ LIFF_ID 還沒填（仍是空的 ''）

**Q：電腦測試可以，手機不行**
→ 手機上確認 LINE 已安裝並登入

---

聯絡電話：03-264-0001
地址：桃園市中壢區南園二路 12 號
