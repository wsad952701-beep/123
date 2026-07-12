# 順記燒臘館 · 線上訂餐系統

**LINE 授權登入 → 綁定帳號 → 站內直接下單**

---

## 先講一件最重要的事

你原本的網站放在 **GitHub Pages**（純網頁，沒有主機）。

**這種網站做不到你要的「LINE 綁定」。**

原因很單純：跟 LINE 換身分要用一把叫 **Channel Secret** 的鑰匙。純網頁的程式碼客人按右鍵就看得到，鑰匙一放上去等於貼在店門口。所以 LINE 規定這把鑰匙**只能放在伺服器裡**。

沒有伺服器 → 拿不到鑰匙 → 只能像你現在這樣「登入完丟去社群叫客人自己貼訂單」。

**所以這一版加了一個伺服器。** GitHub Pages 不能用了，要換一個能跑程式的地方（下面會教，5 分鐘、可以免費）。

---

## 客人會看到什麼

```
   手機打開網站
        │
        ▼
   自由瀏覽菜單                    ← 不用登入，先讓他想吃什麼
        │
        │  按下「＋」想點餐
        ▼
   ┌──────────────────────┐
   │  訂餐前，先用 LINE 登入   │      ← 這個視窗跳出來
   │                      │
   │  ✓ 只會拿到名稱、大頭貼  │
   │  ✕ 拿不到密碼、聊天內容  │
   │  ✕ 不會用你帳號發訊息    │
   │                      │
   │   [ 使用 LINE 登入 ]   │
   └──────────────────────┘
        │
        ▼
   跳到 LINE 官方授權畫面           ← ★ 這就是你要的「顯示授權」
   「順記燒臘館 想要存取你的名稱和大頭貼」
        [ 允許 ]    [ 取消 ]
        │
        │  按「允許」
        ▼
   回到網站，綁定完成 ✓            ← 剛才想點的那一項自動幫他加好
        │
        ▼
   點餐 → 填資料 → 送出訂單
        │
        ▼
   訂單直接進到店裡的後台
   訂單編號 SJ0712-0001
```

按「取消」的人就進不來。**每個人都必須有 LINE、必須按下允許**，正是你要的。

---

## 上線 4 步驟

### 步驟 1️⃣　先去 LINE 申請登入權限

打開 **<https://developers.line.biz/console/>**，用你的 LINE 帳號登入。

**① 建立 Provider**（等於「公司」，只要建一次）
> `Create a new provider` → 名稱填 `順記燒臘館` → Create

**② 建立 LINE Login channel**
> `Create a new channel` → 選 **LINE Login**
>
> | 欄位 | 填什麼 |
> |---|---|
> | Channel name | 順記燒臘館 |
> | Channel description | 線上訂餐 |
> | App types | ☑ **Web app**（一定要勾） |
> | Email address | 你的 email |
>
> → Create

**③ 抄下兩個值**（`Basic settings` 頁籤）
> - **Channel ID** — 一串數字
> - **Channel secret** — 一串亂碼　←　**這是鑰匙，不要給任何人**

⚠️ 這兩個值等一下步驟 3 要用，先貼在記事本。

---

### 步驟 2️⃣　把網站放上去（含網址）

推薦兩個地方，都會**自動給你 HTTPS 網址**（LINE 規定一定要 HTTPS）：

| 平台 | 費用 | 適合 |
|---|---|---|
| **Zeabur**　<https://zeabur.com> | 免費方案可試；穩定用約 NT$150/月 | 台灣團隊、**中文介面**，最推薦 |
| **Render**　<https://render.com> | Free 方案 $0；Starter $7/月 | 英文介面，本專案已附設定檔 |

> **Render 的 Free 方案要注意兩件事**
> 1. 15 分鐘沒人用就會休眠，下一個客人要等約 50 秒才打得開。
> 2. **沒有永久硬碟，重開機訂單會不見。**
>
> 真的要營業，請用 **Starter（$7/月）並加掛一顆 Disk**。專案裡的 `render.yaml` 已經幫你設定好了。

#### 怎麼上傳

1. 把這整個資料夾丟到一個 **GitHub 倉庫**（可以是私人的）
2. 到 Zeabur / Render → `New` → 選你的倉庫
3. 它會自動偵測到是 Node.js 專案並開始部署
4. 部署完會給你一個網址，長得像
   `https://shunji-roast.zeabur.app`

**先把這個網址抄下來。**

#### 想用自己的網域（例如 `www.shunji-roast.tw`）

1. 去 [Gandi](https://www.gandi.net) / [PChome 網路家庭](https://myname.pchome.com.tw) / [Namecheap](https://namecheap.com) 買一個網域
   （`.tw` 約 NT$800/年，`.com` 約 NT$400/年）
2. 在 Zeabur / Render 後台 → `Custom Domain` → 輸入你的網域
3. 平台會告訴你要設一筆 **CNAME** 紀錄，回到網域商後台照著設
4. 等 10 分鐘～幾小時，HTTPS 憑證會自動辦好

---

### 步驟 3️⃣　填設定

在 Zeabur / Render 後台找到 **Environment Variables**（環境變數），加入：

| 名稱 | 值 |
|---|---|
| `BASE_URL` | `https://你剛剛拿到的網址`　←　**結尾不要斜線** |
| `LINE_CHANNEL_ID` | 步驟 1 抄的 Channel ID |
| `LINE_CHANNEL_SECRET` | 步驟 1 抄的 Channel secret |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | 你自己想一組後台密碼 |
| `SESSION_SECRET` | 隨便一串長亂碼（30 字以上） |
| `LINE_FORCE_CONSENT` | `true` |
| `COMMUNITY_URL` | 你的 LINE 社群邀請連結（選填） |

> `LINE_FORCE_CONSENT=true` = **每次登入都會跳出授權畫面**要客人按「允許」。
> 想讓熟客第二次登入不用再按一次，就改成 `false`。

填完 → **Redeploy（重新部署）**。

---

### 步驟 4️⃣　把網址告訴 LINE（最容易錯的一步）

回到 **LINE Developers** → 你的 LINE Login channel → **`LINE Login` 頁籤** → **Callback URL**

填入：

```
https://你的網址/auth/line/callback
```

例如你的網址是 `https://shunji-roast.zeabur.app`，就填：

```
https://shunji-roast.zeabur.app/auth/line/callback
```

> ⚠️ **必須一字不差**。多一個斜線、少一個 `s`、`http` 寫成 `https`，
> 客人按登入就會看到 **400 Bad Request**。
>
> 懶人法：把網站跑起來，看伺服器啟動時印出來的那一行
> `Callback URL   https://.../auth/line/callback`
> **直接複製貼上**，保證不會錯。

最後把 channel 從 `Developing` 切到 **`Published`**（發佈），不然只有你自己能登入。

---

## ✅ 完成！

| 網址 | 做什麼 |
|---|---|
| `https://你的網址` | 客人點餐 |
| `https://你的網址/admin` | 你看訂單（用步驟 3 設的帳密登入） |

---

## 後台長這樣

- 新訂單會亮橘色框，**每 30 秒自動更新**
- 一眼看到：待確認幾筆、今日幾單、今日多少錢、幾個人綁了 LINE
- 點開訂單 → 客人電話可以直接按著撥出
- `確認接單` → `完成出餐`，或 `取消訂單`
- `複製訂單` 可以貼給廚房

---

## 想改東西的時候

### 改價格 / 加菜 / 下架

**兩個檔案都要改，缺一不可：**

| 檔案 | 改哪裡 |
|---|---|
| `src/menu.js` | **價格的真相**。這裡沒有的品名，客人根本送不出訂單。 |
| `public/index.html` | 客人看到的畫面。搜尋品名，改 `data-price="120"` 和顯示的價格。 |

> **為什麼要改兩次？**
> 因為網頁上的價格，懂電腦的人可以在瀏覽器裡把 1980 改成 1 再送出。
> 所以伺服器收到訂單時**完全不看網頁送來的價格**，只認 `src/menu.js`。
> 這是防止被惡意下單的保護，不是麻煩。

### 改營業時間

`src/config.js` 的 `hours`。數字是「從午夜起算的分鐘數」：

```js
1: [[660, 810], [960, 1140]],   // 週一 11:00-13:30、16:00-19:00
6: [],                          // 週六公休
```
> 660 = 11 × 60 → 11:00　　1140 = 19 × 60 → 19:00

### 讓客人可以先挑菜、結帳時才登入

`public/index.html` 搜尋 `LOGIN_BEFORE_ADD`，改成 `false`。
（送出訂單時還是一定要登入，這個擋不掉，伺服器會擋。）

---

## 進階：讓訂單自動發 LINE 通知（選配）

設定好之後，**客人下單會收到 LINE 訂單確認，你也會收到新訂單通知**。

1. LINE Developers → 建一個 **Messaging API** channel（就是官方帳號）
2. `Messaging API` 頁籤 → **Channel access token** → `Issue`
3. 把那串 token 填到環境變數 `LINE_MESSAGING_TOKEN`
4. 自己先在網站用 LINE 登入一次
5. 打開 `data/db.json`，`users` 底下 `U` 開頭那一長串就是你的 LINE userId
6. 填到 `LINE_OWNER_USER_ID`

> 客人要先加你的官方帳號好友才收得到推播。
> 把 `LINE_BOT_PROMPT` 設成 `aggressive`，授權畫面就會順便問客人要不要加好友。

---

## 出問題怎麼辦

| 客人看到 | 原因 | 怎麼修 |
|---|---|---|
| **400 Bad Request**（LINE 畫面） | Callback URL 對不上 | 回步驟 4，一個字一個字比對 |
| **你取消了授權** | 客人自己按了「取消」 | 正常，請他重按並選「允許」 |
| **登入逾時** | 停在授權畫面超過 10 分鐘 | 重按一次登入 |
| **尚未設定 LINE 登入** | Channel ID/Secret 沒填 | 回步驟 3 |
| 網站打不開、很慢 | Render Free 方案休眠了 | 等 50 秒，或升級 Starter |
| **重開機後訂單都不見了** | 沒有掛永久硬碟 | Render 要加 Disk / Zeabur 要加 Volume，掛到 `data` 資料夾 |
| 後台叫我輸入帳密但進不去 | `ADMIN_PASS` 沒設 | 回步驟 3 設定 |

---

## 想在自己電腦先試？

```bash
npm install
cp .env.example .env      # 然後打開 .env 把 LINE 的值填進去
npm start
```

打開 <http://localhost:3000>

> 本機測試時，LINE 的 Callback URL 要另外加一筆
> `http://localhost:3000/auth/line/callback`
> （LINE 只有對 `localhost` 允許 http，正式網址一定要 https）

---

## 資料放在哪

全部在 **`data/db.json`** 這一個檔案裡（客人的 LINE 綁定 + 所有訂單）。

- **備份**＝把這個檔案複製一份走
- 不用安裝資料庫、不用設定連線
- ⚠️ 部署時務必把永久硬碟掛到 `data` 資料夾，否則**重開機資料會全部消失**

---

## 這個系統幫你擋掉的事

| | |
|---|---|
| 🔒 | 有人在瀏覽器把 1980 改成 1 再送單 → **擋掉**，伺服器只認自己的價格 |
| 🔒 | 有人偽造登入 Cookie 冒充別人 → **擋掉**，簽章對不上 |
| 🔒 | 有人偷看別人的訂單 → **擋掉**，只查得到自己的 |
| 🔒 | 訂到公休日、非供應時段、一小時內急單 → **擋掉** |
| 🔒 | 菜單上沒有的品項 → **擋掉** |
| 🔒 | 沒登入直接打 API 送單 → **擋掉** |
| 🔒 | 後台被路人打開 → **擋掉**，要帳密 |

---

## 檔案結構

```
├── server.js              啟動檔
├── src/
│   ├── config.js          設定（營業時間改這裡）
│   ├── line.js            ★ LINE 授權登入的核心
│   ├── menu.js            ★ 價格的真相（改價改這裡）
│   ├── store.js           資料存取
│   ├── session.js         登入狀態（簽章 Cookie）
│   └── routes/
│       ├── auth.js        /auth/line → LINE 授權 → 綁定
│       ├── api.js         /api/orders → 送出訂單
│       └── admin.js       /admin → 後台
├── public/
│   ├── index.html         客人看到的網站
│   ├── admin.html         訂單後台
│   └── assets/            照片
├── data/db.json           客人綁定 + 訂單（要備份的就是它）
├── .env                   你的密碼（★ 絕對不要上傳 GitHub）
├── .env.example           設定範本
├── Dockerfile             要用 Docker 部署時用
└── render.yaml            Render 一鍵部署設定
```
