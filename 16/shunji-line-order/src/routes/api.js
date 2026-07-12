/* ============================================================
   /api/config      → 前端要用的公開設定
   /api/me          → 我是誰（有沒有登入、綁定的 LINE 名字/頭貼）
   /api/orders      → 送出訂單（★ 一定要登入）
   /api/orders/mine → 我的訂單紀錄
   ============================================================ */
import express from 'express';
import { config, lineReady } from '../config.js';
import { requireLogin, getSession } from '../session.js';
import { priceCart, MENU } from '../menu.js';
import {
  createOrder,
  listOrdersByUser,
  getUser,
  ensureUser,
  saveUserProfile,
} from '../store.js';
import { pushText } from '../line.js';

const router = express.Router();

const s = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const money = (n) => n.toLocaleString('en-US');
const pad = (n) => String(n).padStart(2, '0');
const DAY = ['日', '一', '二', '三', '四', '五', '六'];

/* ---------- 公開設定 ---------- */
router.get('/config', (req, res) => {
  res.json({
    lineReady, // 沒設定好就不要顯示登入按鈕
    storeName: config.store.name,
    tel: config.store.tel,
    hours: config.store.hours,
    leadMinutes: config.store.leadMinutes,
    communityUrl: config.communityUrl,
    menuCount: MENU.length,
  });
});

/* ---------- 我是誰 ---------- */
router.get('/me', (req, res) => {
  const sess = getSession(req);
  if (!sess?.lineUserId) {
    return res.json({ loggedIn: false });
  }

  const u = ensureUser(sess) || getUser(sess.lineUserId);
  res.json({
    loggedIn: true,
    user: {
      displayName: u?.displayName || sess.displayName,
      pictureUrl: u?.pictureUrl || sess.pictureUrl || '',
      boundAt: u?.boundAt || null,
      /* 上次填過的訂購資料，讓常客不用重打 */
      profile: u?.profile || {},
    },
  });
});

/* ---------- 送出訂單 ---------- */
router.post('/orders', requireLogin, async (req, res) => {
  const b = req.body || {};

  /* ① 用伺服器的價格重算購物車 */
  const cart = priceCart(b.items);
  if (!cart.ok) {
    return res.status(400).json({ ok: false, error: 'BAD_CART', message: cart.error });
  }

  /* ② 檢查必填欄位 */
  const pickup = Boolean(b.pickup);
  const form = {
    org: s(b.org, 60),
    name: s(b.name, 40),
    tel: s(b.tel, 30),
    addr: pickup ? '' : s(b.addr, 120),
    date: s(b.date, 10),
    time: s(b.time, 5),
    memo: s(b.memo, 300),
  };

  const bad = (message) => res.status(400).json({ ok: false, error: 'BAD_FORM', message });

  if (!form.org) return bad('請填訂購單位');
  if (!form.name) return bad('請填聯絡人');
  if (!/^\d{8,15}$/.test(form.tel.replace(/\D/g, ''))) return bad('電話格式不正確');
  if (!pickup && !form.addr) return bad('外送請填地址');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return bad('請選擇日期');
  if (!/^\d{2}:\d{2}$/.test(form.time)) return bad('請選擇時間');

  /* ③ 檢查取餐時間有沒有在營業時段內 */
  const when = new Date(`${form.date}T${form.time}:00`);
  if (Number.isNaN(when.getTime())) return bad('日期或時間格式不正確');

  const mins = when.getHours() * 60 + when.getMinutes();
  const slots = config.store.hours[when.getDay()] || [];

  if (!slots.length) return bad('這天公休，請改其他日子');
  if (!slots.some(([a, z]) => mins >= a && mins <= z)) {
    return bad('不在供應時段內（11:00–13:30／16:00–19:00）');
  }
  if (when.getTime() < Date.now() + config.store.leadMinutes * 60_000) {
    return bad(`請至少提前 ${config.store.leadMinutes} 分鐘訂餐`);
  }

  /* ④ 存檔（綁定到這個人的 LINE userId） */
  const order = createOrder({
    lineUserId: req.user.lineUserId,
    lineName: req.user.displayName,
    ...form,
    pickup,
    items: cart.items,
    boxes: cart.boxes,
    total: cart.total,
  });

  /* 記住這次填的資料，下次自動帶入 */
  saveUserProfile(req.user.lineUserId, {
    org: form.org,
    name: form.name,
    tel: form.tel,
    addr: form.addr,
  });

  /* ⑤ 推播通知（選配，沒設定就自動略過，不影響訂單） */
  const text = orderText(order);
  pushText(req.user.lineUserId, `✅ 訂單已成立\n\n${text}`).catch(() => {});
  if (config.messaging.ownerUserId) {
    pushText(config.messaging.ownerUserId, `🔔 有新訂單\n\n${text}`).catch(() => {});
  }

  res.json({
    ok: true,
    order: {
      orderNo: order.orderNo,
      total: order.total,
      items: order.items,
      pickup: order.pickup,
      date: order.date,
      time: order.time,
    },
    text, // 前端可讓客人複製
  });
});

/* ---------- 我的訂單 ---------- */
router.get('/orders/mine', requireLogin, (req, res) => {
  res.json({
    ok: true,
    orders: listOrdersByUser(req.user.lineUserId).map((o) => ({
      orderNo: o.orderNo,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      pickup: o.pickup,
      date: o.date,
      time: o.time,
      items: o.items,
    })),
  });
});

/* 訂單文字（推播 / 複製 / 後台都共用同一份） */
export function orderText(o) {
  const dash = '────────────────';
  const w = new Date(`${o.date}T${o.time}:00`);
  const when = `${w.getMonth() + 1}/${w.getDate()}（${DAY[w.getDay()]}） ${pad(
    w.getHours()
  )}:${pad(w.getMinutes())}`;

  const L = [];
  L.push(`${config.store.name}・線上訂單`);
  L.push(dash);
  L.push(`訂單編號｜${o.orderNo}`);
  L.push(`訂購單位｜${o.org}`);
  L.push(`聯 絡 人｜${o.name}`);
  L.push(`客戶電話｜${o.tel}`);
  L.push(`LINE　　｜${o.lineName}`);
  L.push(`取餐方式｜${o.pickup ? '★ 自取' : '外送'}`);
  if (!o.pickup) {
    L.push(`外送地址｜${o.addr}`);
    L.push(`外送份數｜${o.boxes} 份`);
  }
  L.push(`${o.pickup ? '自取時間' : '送達時間'}｜${when}`);
  L.push(`備　　註｜${o.memo || '無'}`);
  L.push(dash);
  L.push('餐點明細');
  o.items.forEach((i) => {
    L.push(`・${i.name}　×${i.qty} ${i.unit}　NT$${money(i.subtotal)}`);
  });
  L.push(dash);
  L.push(`合　　計｜${o.items.length} 項　NT$${money(o.total)}`);
  return L.join('\n');
}

export default router;
