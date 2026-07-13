# 順記 · 線上點餐 ＋ 後台

點餐 → 訂單圖 → 一鍵貼進 LINE 社群。
後台登入就能改**圖片、價格、數量**。

零依賴、純靜態、丟上 GitHub Pages 就會動。

---

## 這包裡面有什麼

| 檔案 | 幹嘛用的 |
|---|---|
| **`index.html`** | **點餐頁（客人看的）**。商品圖、價格、剩餘數量、加減、結帳。送出後跳到 `order.html`。 |
| **`admin.html`** | **後台**。登入後改圖片 / 價格 / 數量 / 店家設定。 |
| **`shunji-store.js`** | 資料層。菜單、店家設定、登入、匯出、發佈。三個頁面共用。 |
| **`data/menu.json`** | **客人看到的菜單**。後台「發佈」就是把新的這一份放回網站。 |
| `order.html` | 訂單完成頁。產訂單圖 → 系統分享 → LINE → 社群。 |
| `shunji-share.js` | 產圖與分享的模組本體。 |
| `check.html` | **第一次先開這個。** 用手機開，30 秒測出分享這條路走不走得通。 |
| `snippet.html` | 不想換頁面的話，這是貼進你「現有」完成頁的最小片段。 |
| `preview/` | 產出來的訂單圖長怎樣，先看一眼。 |

---

## 30 秒上手

```bash
# 1. 整個資料夾丟進你的 repo
# 2. push 到 GitHub Pages
# 3. 手機開 .../check.html   → 圖片分享 ✓ 亮綠燈 = 主線通
# 4. 手機開 .../index.html   → 點餐
# 5. 手機開 .../admin.html   → 後台
```

---

## 後台

網址：`你的網站/admin.html`（點餐頁最下面也有「後台」連結）

```
帳號　a032640001
密碼　qq1111
```

### 商品頁 —— 你要的三件事都在同一列

| 你想改 | 怎麼改 |
|---|---|
| **圖片** | 點左邊的縮圖 → 選照片（手機會直接開相機／相簿）。系統會自動壓小。 |
| **價格** | 直接在 `NT$` 那格改數字。 |
| **數量** | 右邊那格。**留白 = 不限量**，填 `0` = 售完（客人那邊會變灰、按不下去）。 |

右邊的開關是**上下架**。點「⌄」展開還可以改描述、分類、排序、刪除。

改完會**自動存**，不用按儲存。

### 設定頁

店名、副標、公告、**店家 LOGO**（會印在訂單圖上）、點餐頁主視覺、LINE 社群連結、取餐方式、外送最低消費、訂單編號開頭、訂單圖頁尾字、**改帳號密碼**。

---

## ⚠️ 三件事，先講清楚免得你白忙

### 1. 這個後台擋不了懂技術的人

沒有伺服器，帳密是在瀏覽器裡驗的。**任何人打開網頁原始碼都看得到密碼的雜湊值**，要繞過登入畫面也不難。

它擋得住的是：手滑點進去的客人。
它擋不住的是：真的想搞你的人。

要真正安全就得有一台伺服器（Cloudflare Workers、Vercel、自架都行）——那是另一個題目。

### 2. 你在後台改的東西，只存在你這台裝置

客人用**自己的手機**打開網站，看到的是伺服器上的 `data/menu.json`。
你在後台改的東西存在**你這支手機的瀏覽器**裡。

**所以改完一定要「發佈」，客人才看得到。**

> 例外：如果你是拿一台平板放在店裡給客人點，那台就是你改的那台 → 不用發佈也會動。

### 3. 後台收不到訂單

客人按送出之後，訂單變成一張圖，由客人自己分享進 LINE 社群。
**你是在 LINE 裡收單，不是在後台。** 後台只管菜單。

---

## 發佈 —— 把新菜單推給客人

### 方法一 · 手動（不用設定）

1. 後台 →「發佈」→ 下載 `menu.json`
2. 上傳到 GitHub，覆蓋 `data/menu.json`
3. 等一分鐘，客人重新整理就是新的

### 方法二 · 一鍵發佈（設定一次，之後在手機上按一顆按鈕就好）

後台 →「發佈」→ 展開「一鍵發佈到 GitHub」，填：

| 欄位 | 例 |
|---|---|
| GitHub 帳號 | `wsad952701-beep` |
| 儲存庫名稱 | `shunji-share` |
| 分支 | `main` |
| 檔案路徑 | `data/menu.json` |
| 存取權杖 | `github_pat_…` |

**權杖怎麼拿：**
GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token →
Repository access 只選這一個 repo → Permissions → **Contents: Read and write**。

權杖只存在你這台裝置的瀏覽器，不會寫進 `menu.json`。
**手機不是你的就別存。**

之後在手機上改完價錢 → 按「發佈到網站」→ 一分鐘後客人就看到新的。

---

## 改密碼

後台 → 設定 → 帳號密碼 → 填新的 → 「更新帳號密碼」。

**這台裝置立刻生效。** 但其他裝置還是舊的——因為預設密碼寫在 `shunji-store.js` 裡。
畫面會給你一段這樣的東西，貼回 `shunji-store.js` 最上面再 push，就全裝置生效：

```js
var ADMIN = {
  user: 'a032640001',
  salt: 'sjk3n8x2q1',
  hash: '9f2c…'
};
```

（存的是 SHA-256 雜湊，不是明碼。但如同上面說的，這不是真正的資安。）

---

## 圖片與容量

上傳的照片會被壓成 dataURL 存進 `menu.json`：

| 用途 | 壓成 |
|---|---|
| 商品照 | 長邊 800px、JPEG 75% |
| 主視覺 | 長邊 1100px、JPEG 78% |
| LOGO | 長邊 300px、PNG（保留透明） |

瀏覽器大概只給 5MB，**大約 15～20 張商品照就會滿**。後台頂端會顯示目前資料大小，快滿了會警告。

**照片多的話，改用檔案路徑比較好：**

1. 把照片放進 repo，例如 `img/goose.jpg`
2. 後台 → 商品 → 展開 → 「圖片網址」填 `img/goose.jpg`

這樣 `menu.json` 只存一行路徑，客人載得也快。

---

## 資料格式（`data/menu.json`）

```jsonc
{
  "settings": {
    "brand": "順記",
    "brandSub": "碳燒燒鵝 · 線上點餐",
    "logo": "",                    // dataURL 或 "img/logo.png"
    "hero": "",
    "notice": "今日 20:00 收單",
    "communityUrl": "https://line.me/ti/g2/xxxx",
    "footer": "此圖為訂單內容，請商家回覆確認",
    "codePrefix": "SJ",
    "modes": ["外送", "自取", "內用"],
    "minOrder": 0                  // 外送最低消費，0 = 不限
  },
  "items": [
    {
      "id": "p1",
      "name": "碳燒原隻燒鵝腿飯",
      "desc": "帶皮鵝腿 · 附例湯",
      "cat": "飯類",
      "price": 220,
      "stock": null,               // null = 不限量；0 = 售完；數字 = 剩幾份
      "img": "",                   // 空 = 用品名第一個字當底圖
      "on": true                   // false = 下架
    }
  ]
}
```

手改壞了也不會整個掛掉——缺的欄位 `shunji-store.js` 會自動補回預設值。

---

## 為什麼訂單要用「圖片」

| 想法 | 可不可行 |
|---|---|
| 伺服器用 bot 自動推播進社群 | ✗ **社群（OpenChat）不支援 Messaging API 機器人**，只有一般「群組」才行 |
| 網頁直接把文字塞進社群輸入框 | ✗ 瀏覽器沒這種權限，做不到 |
| **系統分享面板 → LINE → 選社群 → 送出** | ✓ **唯一能一鍵做到的路** |

圖片當主力，因為：社群一定收得到圖、資訊完整不怕貼歪、在訊息洪流裡一眼認得出來。
文字版全程都在剪貼簿裡，走不通就退回去，不會卡死。

### 自動降級順序

1. `navigator.share({ files:[PNG] })` — iOS / Android 主線
2. `navigator.share({ text })` — 沒有檔案分享能力時
3. `https://line.me/R/share?text=…` — 沒有 Web Share 時（LINE 內建瀏覽器特別好用）
4. 全程都會順手把文字複製到剪貼簿，最壞情況使用者仍可長按貼上

---

## ⚠️ 唯一的地雷（改 `order.html` 前先看）

iOS Safari 規定 `navigator.share()` 必須在**使用者手勢的同一拍**內呼叫。
按鈕按下去之後才 `await` 產圖，手勢授權就過期了 → 直接噴 `NotAllowedError`。

```js
// ✗ 壞的 —— 十個人有九個這樣寫，然後在 iPhone 上失敗
btn.onclick = async () => {
  const file = await makeImage();       // 手勢授權在這行死掉
  await navigator.share({ files:[file] });
};

// ✓ 好的 —— 本模組的做法
ShunjiShare.setOrder(order);            // 訂單一來就在背景把圖畫好放著
btn.onclick = () => ShunjiShare.share();// 按下去是同步呼叫，授權還在
```

**所以：`setOrder()` 要早，`share()` 的 handler 不可以是 `async`。**

---

## 接你自己的訂單系統

不想用 `index.html`？`order.html` 會**依序**找訂單，找到就用：

**(1) sessionStorage（`index.html` 就是走這條）**
```js
sessionStorage.setItem('shunji_order', JSON.stringify(order));
location.href = 'order.html';
```

**(2) 全域變數**
```html
<script>window.SHUNJI_ORDER = { ... };</script>
<script src="./shunji-share.js"></script>
```

**(3) 網址參數**
```js
const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(order))))
              .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
location.href = 'order.html?o=' + b64;
```

**(4) 都沒有** → 顯示示範訂單，畫面上會標紅字提醒。

### 訂單格式

```js
{
  code : 'SJ0713-2678',
  mode : '外送',                 // 外送 / 自取 / 內用
  when : '7/13（一）12:00',
  items: [{ name:'碳燒原隻燒鵝腿飯', qty:2, price:440 }],   // price 是小計，不是單價
  total: 440,
  note : '不要香菜',
  customer: { name:'王小明', phone:'0912-345-678', address:'…' }
}
```

---

## API

### `ShunjiStore`（菜單與後台）

```js
ShunjiStore.data()          // 目前生效的整包資料
ShunjiStore.settings()      // 店家設定
ShunjiStore.items()         // 商品陣列
ShunjiStore.edit()          // 拿一份可以改的副本
ShunjiStore.save(d)         // 存回本機（標記為「未發佈」）
ShunjiStore.refresh()       // 去抓網站上的 data/menu.json
ShunjiStore.onChange(fn)    // 資料變了就通知

ShunjiStore.login(u, p)     // 驗帳密
ShunjiStore.isLoggedIn()
ShunjiStore.logout()
ShunjiStore.changeCred(u,p) // 換帳密，回傳新的 { user, salt, hash }

ShunjiStore.isDirty()       // 有沒有未發佈的修改
ShunjiStore.json()          // 匯出用的 JSON 字串
ShunjiStore.download()      // 下載 menu.json
ShunjiStore.importJSON(txt)
ShunjiStore.publish()       // 一鍵發佈到 GitHub
ShunjiStore.markPublished() // 手動上傳完之後，標記為已發佈
ShunjiStore.discardLocal()  // 丟掉本機修改
ShunjiStore.resetAll()      // 清光本機資料
```

### `ShunjiShare`（產圖與分享）

```js
ShunjiShare.config({ brand, brandSub, logo, communityUrl, filename, footer })
ShunjiShare.setOrder(order)   // 餵訂單，並立刻開始在背景產圖
ShunjiShare.share()           // Promise<'image'|'text'|'line-url'|'cancel'>
ShunjiShare.ready()           // Promise，圖產好時 resolve
ShunjiShare.imageUrl()        // dataURL，拿來做預覽縮圖
ShunjiShare.text()            // 純文字版訂單
ShunjiShare.copy()            // 只複製文字
ShunjiShare.saveImage()       // 下載 PNG
ShunjiShare.openCommunity()   // 複製文字 + 跳去社群（舊流程備援）
ShunjiShare.caps()            // { shareFile, shareText, inLine, imageReady }
```

---

## 改樣式

- **點餐頁 / 後台**：各自 HTML 最上面的 `:root` 色票。
- **訂單圖**：`shunji-share.js` 最上面的 `C`（配色）與 `CFG`（尺寸、檔名）。
  收據圖下緣的鋸齒撕票口在 `receiptPath()` 的 `TEETH` / `DEPTH`。

---

## 還有一步只有真機能驗

LINE 的傳送對象清單裡會不會列出「社群」，取決於 LINE 的版本，這點沒辦法從程式碼保證。

用 `check.html` 實測一次。萬一真的沒列出來，備援路徑仍然穩：
**儲存圖片 → 進社群 → 相簿選最新一張 → 送出**。社群收圖片是 100% 沒問題的。
