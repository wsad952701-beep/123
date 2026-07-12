/* ============================================================
   LINE Login v2.1（OAuth 2.0 / OpenID Connect）

   完整流程（就是客人在手機上會看到的）：

     1. 客人在手機瀏覽器點「LINE 登入訂餐」
     2. 我們把他導去 access.line.me 的「授權畫面」
        → 手機上會直接喚起 LINE App，畫面顯示：
             「順記燒臘館 想要存取：你的名稱、大頭貼」
             [ 允許 ]  [ 取消 ]
     3. 客人按「允許」→ LINE 帶著一組 code 導回我們的 /auth/line/callback
     4. 伺服器拿 code + Channel Secret 去換 access_token 與 id_token
     5. 驗證 id_token（確認真的是 LINE 簽發的、nonce 相符）
        → 取出 sub = 這個人的 LINE userId（唯一，永遠不變）
     6. 存進資料庫 = 「綁定完成」，並發登入 Cookie

   ★ Channel Secret 只存在伺服器，永遠不會出現在網頁原始碼裡。
     這就是為什麼一定要有後端，純靜態網頁做不到真正的綁定。
   ============================================================ */
import crypto from 'node:crypto';
import { config, lineReady } from './config.js';

const AUTHORIZE = 'https://access.line.me/oauth2/v2.1/authorize';
const TOKEN = 'https://api.line.me/oauth2/v2.1/token';
const VERIFY = 'https://api.line.me/oauth2/v2.1/verify';
const REVOKE = 'https://api.line.me/oauth2/v2.1/revoke';
const PUSH = 'https://api.line.me/v2/bot/message/push';

export const rnd = (n = 16) => crypto.randomBytes(n).toString('hex');

/* ---------- 步驟 2：組出授權網址 ---------- */
export function buildAuthorizeUrl({ state, nonce }) {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: config.line.channelId,
    redirect_uri: config.line.callbackUrl,
    state,
    scope: 'profile openid', // 只要名稱與大頭貼，不碰好友名單、不能替他發訊息
    nonce,
  });

  /* ★ 這一行就是「每次點 LINE 都會跳出授權畫面」的關鍵。
     不加的話，客人第二次登入 LINE 會直接放行、不再問一次。 */
  if (config.line.forceConsent) p.set('prompt', 'consent');

  /* 順便邀請客人加官方帳號好友（需要先綁 Messaging API channel） */
  if (config.line.botPrompt) p.set('bot_prompt', config.line.botPrompt);

  /* LINE 文件用 %20 而不是 +，這裡跟著對齊，避免某些版本的 App 解析不到 scope */
  return `${AUTHORIZE}?${p.toString().replace(/\+/g, '%20')}`;
}

/* ---------- 步驟 4：用 code 換 token ---------- */
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.line.callbackUrl, // 必須跟步驟 2 完全一樣
    client_id: config.line.channelId,
    client_secret: config.line.channelSecret,
  });

  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new LineError(
      `LINE 換取權杖失敗（${r.status}）`,
      data.error_description || data.error || '',
      data
    );
  }
  return data; // { access_token, id_token, refresh_token, expires_in, ... }
}

/* ---------- 步驟 5：驗證 id_token，取出 LINE userId ---------- */
export async function verifyIdToken(idToken, nonce) {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: config.line.channelId,
  });
  if (nonce) body.set('nonce', nonce);

  const r = await fetch(VERIFY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new LineError(
      'LINE 身分驗證失敗',
      data.error_description || data.error || '',
      data
    );
  }

  /* data = { iss, sub, aud, exp, iat, name, picture, email? }
     sub 就是這個人的 LINE userId，例如 U1a2b3c4d5... */
  if (data.aud !== config.line.channelId) {
    throw new LineError('LINE 身分驗證失敗', 'aud 不符');
  }

  return {
    lineUserId: data.sub,
    displayName: data.name || 'LINE 用戶',
    pictureUrl: data.picture || '',
    email: data.email || '',
  };
}

/* ---------- 解除綁定時順便撤銷 LINE 的 token ---------- */
export async function revoke(accessToken) {
  if (!accessToken || !lineReady) return;
  try {
    await fetch(REVOKE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: accessToken,
        client_id: config.line.channelId,
        client_secret: config.line.channelSecret,
      }),
    });
  } catch {
    /* 撤銷失敗不影響登出 */
  }
}

/* ---------- 訂單推播（選配，需 Messaging API）---------- */
export async function pushText(to, text) {
  if (!config.messaging.enabled || !to) return { skipped: true };

  try {
    const r = await fetch(PUSH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.messaging.token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text: String(text).slice(0, 4900) }],
      }),
    });
    if (!r.ok) {
      const e = await r.text().catch(() => '');
      /* 客人沒加官方帳號好友就會失敗，這很正常，不要讓訂單跟著失敗 */
      console.warn('LINE 推播未送出：', r.status, e.slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.warn('LINE 推播錯誤：', e.message);
    return { ok: false };
  }
}

export class LineError extends Error {
  constructor(message, detail = '', raw = null) {
    super(message);
    this.name = 'LineError';
    this.detail = detail;
    this.raw = raw;
  }
}
