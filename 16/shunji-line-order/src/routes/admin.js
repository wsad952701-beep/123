/* ============================================================
   後台 /admin — 看訂單、改狀態
   用 HTTP Basic 驗證，帳密設在 .env 的 ADMIN_USER / ADMIN_PASS。
   沒設 ADMIN_PASS 的話後台整個關閉（避免不小心把訂單公開）。
   ============================================================ */
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { listOrders, setOrderStatus, stats, listUsers } from '../store.js';
import { orderText } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/* 定時比對，避免用回應時間猜密碼 */
function same(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

router.use((req, res, next) => {
  if (!config.admin.enabled) {
    return res
      .status(404)
      .type('text/plain; charset=utf-8')
      .send('後台未啟用。請在 .env 設定 ADMIN_PASS 後重新啟動。');
  }

  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const [u, p] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
    if (same(u, config.admin.user) && same(p, config.admin.pass)) return next();
  }

  res
    .status(401)
    .set('WWW-Authenticate', 'Basic realm="Shunji Admin", charset="UTF-8"')
    .type('text/plain; charset=utf-8')
    .send('需要帳號密碼');
});

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin.html'));
});

router.get('/api/orders', (req, res) => {
  res.json({
    ok: true,
    stats: stats(),
    orders: listOrders().map((o) => ({ ...o, text: orderText(o) })),
  });
});

router.get('/api/users', (req, res) => {
  res.json({ ok: true, users: listUsers() });
});

router.post('/api/orders/:orderNo/status', express.json(), (req, res) => {
  const allowed = ['new', 'confirmed', 'done', 'cancelled'];
  const status = String(req.body?.status || '');
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, message: '狀態不正確' });
  }
  const o = setOrderStatus(req.params.orderNo, status);
  if (!o) return res.status(404).json({ ok: false, message: '找不到訂單' });
  res.json({ ok: true, order: o });
});

export default router;
