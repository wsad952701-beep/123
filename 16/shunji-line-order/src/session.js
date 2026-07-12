/* ============================================================
   登入狀態 — 用 HMAC 簽章的 Cookie
   客人改不了 Cookie 內容（改了簽章就對不上），所以不需要額外的資料庫。
   ============================================================ */
import crypto from 'node:crypto';
import { config } from './config.js';
import { ensureUser } from './store.js';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function hmac(body) {
  return crypto
    .createHmac('sha256', config.session.secret)
    .update(body)
    .digest('base64url');
}

/** 把物件簽章成一段字串 */
export function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${hmac(body)}`;
}

/** 驗證字串並取回物件；失敗或過期回傳 null */
export function unsign(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const i = token.lastIndexOf('.');
  const body = token.slice(0, i);
  const mac = token.slice(i + 1);

  const expected = hmac(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

const baseCookie = () => ({
  httpOnly: true,
  sameSite: 'lax', // 從 LINE 導回來時 Cookie 才送得到
  secure: config.baseUrl.startsWith('https://'),
  path: '/',
});

/** 登入：寫入 session cookie */
export function setSession(res, data) {
  const exp = Date.now() + config.session.days * 86400_000;
  res.cookie(config.session.cookieName, sign({ ...data, exp }), {
    ...baseCookie(),
    maxAge: config.session.days * 86400_000,
  });
}

/** 登出 */
export function clearSession(res) {
  res.clearCookie(config.session.cookieName, baseCookie());
}

/** 讀取目前登入者；沒登入回傳 null */
export function getSession(req) {
  return unsign(req.cookies?.[config.session.cookieName]);
}

/** OAuth 過程中暫存 state / nonce（10 分鐘後失效） */
export function setOAuthState(res, data) {
  res.cookie(
    config.session.oauthCookieName,
    sign({ ...data, exp: Date.now() + 600_000 }),
    { ...baseCookie(), maxAge: 600_000 }
  );
}

export function takeOAuthState(req, res) {
  const v = unsign(req.cookies?.[config.session.oauthCookieName]);
  res.clearCookie(config.session.oauthCookieName, baseCookie());
  return v;
}

/** 擋住未登入的 API */
export function requireLogin(req, res, next) {
  const s = getSession(req);
  if (!s?.lineUserId) {
    return res.status(401).json({
      ok: false,
      error: 'NOT_LOGGED_IN',
      message: '請先用 LINE 登入才能訂餐',
    });
  }
  ensureUser(s); // 資料庫被清掉但 Cookie 還在時，把人補回來
  req.user = s;
  next();
}
