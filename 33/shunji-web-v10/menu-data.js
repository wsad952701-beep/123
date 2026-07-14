/* ══════════════════════════════════════════════════════════════
   順記燒臘館 · 菜單設定（公開版 v10）

   ★ 這個檔案不用手動改。

   改法 A（推薦）── 後台自動發佈：
     1. 打開 admin.html（例：https://你的帳號.github.io/倉庫名/admin.html）
     2. 第一次要設定 GitHub 帳號 → 發佈設定頁籤 → 填好 → 儲存
     3. 改完價格 / 數量 / 特餐 → 按【一鍵發佈】
        → 自動幫你更新這個檔案，客人 2 分鐘內就看到

   改法 B ── 手動貼上（跟舊版一樣）：
     1. 打開 admin.html 後台 → 發佈設定頁籤 → 複製設定碼
     2. 回 GitHub 打開 menu-data.js → 全選貼上 → Commit

   欄位說明：
     price      : 覆寫後的價格 { 品名 : 數字 }
     sold       : 已售完標記 { 品名 : 1 }（客人看得到但不能點）
     hidden     : 下架 { 品名 : 1 }（整個藏起來）
     img        : 更換後的圖片 { src : dataUrl }
     special    : 今日特餐 [{ name, price?, qty? }]
     qty        : 今日份數 { 品名 : 數字 }
     soldToday  : 今日已售出 { 品名 : 數字 }（會自動累加）
     notice     : 公告文字
     noticeType : 公告樣式 info / warn / promo
   ══════════════════════════════════════════════════════════════ */

var MENU_DATA = {
  "price": {},
  "sold": {},
  "hidden": {},
  "img": {},
  "special": [],
  "qty": {},
  "soldToday": {},
  "notice": "",
  "noticeType": "info"
};
