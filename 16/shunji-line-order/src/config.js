/* ============================================================
   順記燒臘館 · 系統設定
   所有設定都從 .env 檔讀取，這個檔案不用改。
   ============================================================ */
import 'dotenv/config';
import crypto from 'node:crypto';

const trimSlash = (s) => String(s || '').replace(/\/+$/, '');

const PORT = Number(process.env.PORT || 3000);

/* BASE_URL = 你的正式網址，例如 https://www.shunji-roast.tw
   LINE 的 Callback URL 必須跟這個一模一樣，不能差一個字。 */
const BASE_URL = trimSlash(process.env.BASE_URL) || `http://localhost:${PORT}`;

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export const config = {
  port: PORT,
  baseUrl: BASE_URL,
  isProd: process.env.NODE_ENV === 'production',

  /* ---------- 店家資訊（顯示用，可自行修改） ---------- */
  store: {
    name: '順記燒臘館',
    tel: '03-264-0001',
    /* 營業時段：分鐘數（11:00 = 660）。週六日公休。 */
    hours: {
      1: [[660, 810], [960, 1140]],
      2: [[660, 810], [960, 1140]],
      3: [[660, 810], [960, 1140]],
      4: [[660, 810], [960, 1140]],
      5: [[660, 810], [960, 1140]],
      6: [],
      0: [],
    },
    leadMinutes: 60, // 至少提前幾分鐘下單
  },

  /* ---------- LINE Login（登入 / 授權 / 綁定）---------- */
  line: {
    channelId: (process.env.LINE_CHANNEL_ID || '').trim(),
    channelSecret: (process.env.LINE_CHANNEL_SECRET || '').trim(),
    callbackPath: '/auth/line/callback',
    get callbackUrl() {
      return BASE_URL + this.callbackPath;
    },
    /* true = 每次登入都強制跳出「授權畫面」讓客人按同意
       false = 只有第一次授權，之後直接登入 */
    forceConsent: String(process.env.LINE_FORCE_CONSENT || 'true') !== 'false',
    /* aggressive = 授權時順便問客人要不要加官方帳號好友（需綁 Messaging API channel）
       留空 = 不問 */
    botPrompt: (process.env.LINE_BOT_PROMPT || '').trim(),
  },

  /* ---------- LINE Messaging API（訂單推播，選配）---------- */
  messaging: {
    token: (process.env.LINE_MESSAGING_TOKEN || '').trim(),
    ownerUserId: (process.env.LINE_OWNER_USER_ID || '').trim(),
    get enabled() {
      return Boolean(this.token);
    },
  },

  /* ---------- 登入狀態（簽章 Cookie）---------- */
  session: {
    secret: SESSION_SECRET,
    cookieName: 'sj_sess',
    oauthCookieName: 'sj_oauth',
    days: Number(process.env.SESSION_DAYS || 30),
  },

  /* ---------- 後台 ---------- */
  admin: {
    user: (process.env.ADMIN_USER || 'admin').trim(),
    pass: (process.env.ADMIN_PASS || '').trim(),
    get enabled() {
      return Boolean(this.pass);
    },
  },

  /* ---------- LINE 社群邀請連結（選配，訂單完成後可引導加入）---------- */
  communityUrl: (process.env.COMMUNITY_URL || '').trim(),

  dataDir: process.env.DATA_DIR || './data',
};

/* LINE 有沒有設定好？沒設定的話網站照樣能瀏覽，只是不能登入訂餐。 */
export const lineReady = Boolean(
  config.line.channelId && config.line.channelSecret
);

/* 啟動時把狀況印出來，一眼看出哪裡沒設定好 */
export function printStartupReport() {
  const ok = (b) => (b ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m');
  const lines = [
    '',
    '  ┌────────────────────────────────────────────────┐',
    '  │  順記燒臘館 · 線上訂餐系統                     │',
    '  └────────────────────────────────────────────────┘',
    '',
    `   網址        ${config.baseUrl}`,
    `   Port        ${config.port}`,
    '',
    `   ${ok(lineReady)} LINE 登入      ${
      lineReady
        ? `Channel ${config.line.channelId}`
        : '未設定 → 請填 .env 的 LINE_CHANNEL_ID / LINE_CHANNEL_SECRET'
    }`,
    `   ${ok(lineReady)} Callback URL   ${config.line.callbackUrl}`,
    `       ↑ 這一行必須「一字不差」貼到 LINE Developers 的 Callback URL`,
    '',
    `   ${ok(config.messaging.enabled)} 訂單推播      ${
      config.messaging.enabled
        ? '已啟用（客人與店家會收到 LINE 通知）'
        : '未啟用（選配，不影響訂餐）'
    }`,
    `   ${ok(config.admin.enabled)} 後台          ${
      config.admin.enabled
        ? `${config.baseUrl}/admin`
        : '未設定 ADMIN_PASS → 後台已停用'
    }`,
    `   ${ok(Boolean(process.env.SESSION_SECRET))} 登入金鑰      ${
      process.env.SESSION_SECRET
        ? '已設定'
        : '未設定（每次重啟客人要重新登入，正式上線請設 SESSION_SECRET）'
    }`,
    '',
  ];
  console.log(lines.join('\n'));
}
