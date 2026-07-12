/* ============================================================
   /auth/line           → 把客人送去 LINE 的授權畫面
   /auth/line/callback  → LINE 授權完導回來，換 token、綁定、發登入 Cookie
   /auth/logout         → 登出
   ============================================================ */
import express from 'express';
import { config, lineReady } from '../config.js';
import {
  buildAuthorizeUrl,
  exchangeCode,
  verifyIdToken,
  revoke,
  rnd,
} from '../line.js';
import {
  setSession,
  clearSession,
  getSession,
  setOAuthState,
  takeOAuthState,
} from '../session.js';
import { upsertUser } from '../store.js';
import { errorPage } from '../pages.js';

const router = express.Router();

/* 只允許導回自己站內的路徑，避免被拿來當跳板 */
function safeReturn(v) {
  const s = String(v || '/');
  if (!s.startsWith('/') || s.startsWith('//')) return '/';
  return s;
}

/* ---------- ① 開始登入：導向 LINE 授權畫面 ---------- */
router.get('/line', (req, res) => {
  if (!lineReady) {
    return res.status(503).send(
      errorPage({
        title: '尚未設定 LINE 登入',
        message: '店家還沒把 LINE 的金鑰填進伺服器，暫時無法用 LINE 登入。',
        hint:
          '給店家：請在 .env 填入\n' +
          'LINE_CHANNEL_ID=...\n' +
          'LINE_CHANNEL_SECRET=...\n' +
          '填完重新啟動即可。',
        retry: false,
      })
    );
  }

  const state = rnd(16); // 防 CSRF
  const nonce = rnd(16); // 防重放攻擊
  const returnTo = safeReturn(req.query.returnTo);

  setOAuthState(res, { state, nonce, returnTo });

  /* 這一跳，客人手機上就會看到 LINE 的授權畫面 */
  res.redirect(buildAuthorizeUrl({ state, nonce }));
});

/* ---------- ② LINE 導回來 ---------- */
router.get('/line/callback', async (req, res) => {
  const { code, state, error, error_description: errDesc } = req.query;
  const saved = takeOAuthState(req, res);

  /* 客人在授權畫面按了「取消」 */
  if (error) {
    const denied = error === 'access_denied';
    return res.status(400).send(
      errorPage({
        title: denied ? '你取消了授權' : 'LINE 登入沒有完成',
        message: denied
          ? '要用 LINE 帳號訂餐，需要你在授權畫面按下<b style="color:#F2D391">「允許」</b>。<br>我們只會拿到你的<b style="color:#F2D391">名稱和大頭貼</b>，不會看到密碼、也不會替你發訊息。'
          : '授權過程中斷了，請再試一次。',
        hint: denied ? '' : `${error}${errDesc ? '：' + errDesc : ''}`,
      })
    );
  }

  /* state 不符 = 這個請求不是我們發出去的 */
  if (!saved || !state || saved.state !== state) {
    return res.status(400).send(
      errorPage({
        title: '登入逾時',
        message:
          '這個登入連結已經失效了（超過 10 分鐘，或中途換了瀏覽器）。<br>請重新點一次 LINE 登入。',
      })
    );
  }

  if (!code) {
    return res.status(400).send(
      errorPage({ title: '登入失敗', message: 'LINE 沒有回傳授權碼，請再試一次。' })
    );
  }

  try {
    /* ③ 換 token（這一步要用 Channel Secret，所以只能在伺服器做） */
    const token = await exchangeCode(code);

    /* ④ 驗證身分，取出 LINE userId */
    const profile = await verifyIdToken(token.id_token, saved.nonce);

    /* ⑤ 寫進資料庫 = 綁定完成 */
    const user = upsertUser(profile);

    /* ⑥ 發登入 Cookie */
    setSession(res, {
      lineUserId: user.lineUserId,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
      at: token.access_token,
    });

    const url = new URL(saved.returnTo, config.baseUrl);
    url.searchParams.set('login', 'ok');
    res.redirect(url.pathname + url.search + url.hash);
  } catch (e) {
    console.error('LINE 登入失敗：', e.message, e.detail || '');

    const isRedirectMismatch =
      /redirect_uri/i.test(e.detail || '') || /redirect/i.test(e.detail || '');

    res.status(500).send(
      errorPage({
        title: 'LINE 登入失敗',
        message: isRedirectMismatch
          ? '伺服器的網址和 LINE 後台登記的網址對不上。'
          : '和 LINE 溝通時發生問題，請再試一次。',
        hint: isRedirectMismatch
          ? '給店家：請到 LINE Developers → LINE Login → Callback URL，\n' +
            '確認裡面有「一字不差」的這一行：\n\n' +
            config.line.callbackUrl
          : `${e.message}${e.detail ? '\n' + e.detail : ''}`,
      })
    );
  }
});

/* ---------- 登出 ---------- */
router.post('/logout', async (req, res) => {
  const s = getSession(req);
  if (s?.at) await revoke(s.at); // 順便跟 LINE 說解除授權
  clearSession(res);
  res.json({ ok: true });
});

router.get('/logout', async (req, res) => {
  const s = getSession(req);
  if (s?.at) await revoke(s.at);
  clearSession(res);
  res.redirect('/');
});

export default router;
