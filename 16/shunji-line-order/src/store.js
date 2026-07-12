/* ============================================================
   資料儲存 — 單純的 JSON 檔案
   不用安裝資料庫、不用設定連線，檔案就在 data/db.json。
   要備份就把那個檔案複製走。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const DIR = path.resolve(config.dataDir);
const FILE = path.join(DIR, 'db.json');

const EMPTY = { users: {}, orders: [], seq: {} };

fs.mkdirSync(DIR, { recursive: true });

let db;
try {
  db = fs.existsSync(FILE)
    ? { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }
    : { ...EMPTY };
} catch (e) {
  console.error('⚠️  db.json 讀取失敗，已改用空白資料。原檔備份為 db.json.bak');
  try {
    fs.copyFileSync(FILE, FILE + '.bak');
  } catch {}
  db = { ...EMPTY };
}

let writing = false;
let dirty = false;

/** 原子寫入：先寫暫存檔再改名，斷電也不會寫壞 */
function flush() {
  if (writing) {
    dirty = true;
    return;
  }
  writing = true;
  const tmp = FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.error('⚠️  資料寫入失敗：', e.message);
  } finally {
    writing = false;
    if (dirty) {
      dirty = false;
      flush();
    }
  }
}

const pad = (n) => String(n).padStart(2, '0');

/* ---------------- 使用者（LINE 綁定）---------------- */

/**
 * LINE 授權成功後建立／更新綁定
 * lineUserId 是 LINE 給的唯一 ID，同一個人永遠一樣。
 */
export function upsertUser({ lineUserId, displayName, pictureUrl, email }) {
  const now = new Date().toISOString();
  const exist = db.users[lineUserId];

  db.users[lineUserId] = {
    lineUserId,
    displayName: displayName || exist?.displayName || 'LINE 用戶',
    pictureUrl: pictureUrl || exist?.pictureUrl || '',
    email: email || exist?.email || '',
    boundAt: exist?.boundAt || now, // 第一次綁定的時間
    lastLoginAt: now,
    loginCount: (exist?.loginCount || 0) + 1,
    profile: exist?.profile || {}, // 記住上次填的公司/電話/地址
  };

  flush();
  return db.users[lineUserId];
}

export function getUser(lineUserId) {
  return db.users[lineUserId] || null;
}

/**
 * 確保這個人在資料庫裡有一筆。
 *
 * 為什麼需要？重新部署、換機器、或資料碟被清掉之後，客人手機裡的登入
 * Cookie 還是有效的（簽章沒過期），但 users 裡已經沒有他了。這時如果不
 * 補回來，「記住上次填的資料」會失效、後台的綁定人數也會少算。
 */
export function ensureUser(session) {
  if (!session?.lineUserId) return null;
  const exist = db.users[session.lineUserId];
  if (exist) return exist;

  return upsertUser({
    lineUserId: session.lineUserId,
    displayName: session.displayName,
    pictureUrl: session.pictureUrl,
  });
}

/** 記住客人上次填過的訂購資料，下次自動帶入 */
export function saveUserProfile(lineUserId, profile) {
  const u = db.users[lineUserId];
  if (!u) return;
  u.profile = { ...u.profile, ...profile };
  flush();
}

export function listUsers() {
  return Object.values(db.users).sort(
    (a, b) => new Date(b.lastLoginAt) - new Date(a.lastLoginAt)
  );
}

/* ---------------- 訂單 ---------------- */

/** 訂單編號：SJ0712-0001（每天從 0001 重新編號，不會撞號） */
function nextOrderNo() {
  const d = new Date();
  const key = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  db.seq[key] = (db.seq[key] || 0) + 1;
  return `SJ${pad(d.getMonth() + 1)}${pad(d.getDate())}-${String(
    db.seq[key]
  ).padStart(4, '0')}`;
}

export function createOrder(order) {
  const row = {
    orderNo: nextOrderNo(),
    createdAt: new Date().toISOString(),
    status: 'new', // new → confirmed → done / cancelled
    ...order,
  };
  db.orders.unshift(row);
  flush();
  return row;
}

export function listOrders({ limit = 300 } = {}) {
  return db.orders.slice(0, limit);
}

export function listOrdersByUser(lineUserId, limit = 30) {
  return db.orders.filter((o) => o.lineUserId === lineUserId).slice(0, limit);
}

export function getOrder(orderNo) {
  return db.orders.find((o) => o.orderNo === orderNo) || null;
}

export function setOrderStatus(orderNo, status) {
  const o = getOrder(orderNo);
  if (!o) return null;
  o.status = status;
  o.updatedAt = new Date().toISOString();
  flush();
  return o;
}

export function stats() {
  const today = new Date().toISOString().slice(0, 10);
  const todays = db.orders.filter((o) => o.createdAt.startsWith(today));
  return {
    users: Object.keys(db.users).length,
    ordersTotal: db.orders.length,
    ordersToday: todays.length,
    revenueToday: todays
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0),
    pending: db.orders.filter((o) => o.status === 'new').length,
  };
}
