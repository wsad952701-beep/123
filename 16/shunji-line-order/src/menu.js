/* ============================================================
   菜單 — 價格的唯一真相
   ------------------------------------------------------------
   為什麼要有這個檔？
   因為前端網頁的價格是「顯示用」的，懂技術的人可以在瀏覽器裡把
   1980 改成 1，然後送出訂單。所以伺服器收到訂單時，一律不看前端
   送來的價格，只用這裡的價格重算。

   ★ 改價格 / 加菜 / 下架，改這裡 + public/index.html 兩個地方。
     （這裡沒有的品名，客人根本送不出訂單）
   ============================================================ */

export const MENU = [
  /* ── 招牌飯類 ── */
  { name: '碳燒原隻燒鵝腿飯', price: 220, unit: '份', cat: 'rice' },
  { name: '碳燒原隻燒鴨腿飯', price: 160, unit: '份', cat: 'rice' },
  { name: '順記四寶飯',       price: 150, unit: '份', cat: 'rice' },
  { name: '順記特製雙拼飯',   price: 150, unit: '份', cat: 'rice' },
  { name: '原隻雞腿飯',       price: 150, unit: '份', cat: 'rice' },
  { name: '順記三寶飯',       price: 140, unit: '份', cat: 'rice' },
  { name: '碳燒蜜汁雞腿飯',   price: 130, unit: '份', cat: 'rice' },
  { name: '順記雙拼飯',       price: 130, unit: '份', cat: 'rice' },

  /* ── 燒味飯 ── */
  { name: '碳燒脆皮燒鵝飯',   price: 160, unit: '份', cat: 'bbq' },
  { name: '碳燒脆皮燒鴨飯',   price: 130, unit: '份', cat: 'bbq' },
  { name: '碳燒脆皮燒肉飯',   price: 120, unit: '份', cat: 'bbq' },
  { name: '碳燒蜜汁叉燒飯',   price: 120, unit: '份', cat: 'bbq' },
  { name: '玫瑰油雞飯',       price: 120, unit: '份', cat: 'bbq' },
  { name: '香港臘味飯',       price: 120, unit: '份', cat: 'bbq' },
  { name: '蜜汁香腸飯',       price: 110, unit: '份', cat: 'bbq' },

  /* ── 整隻・部位 ── */
  { name: '碳燒脆皮大鵝（整隻）',   price: 1980, unit: '份', cat: 'whole' },
  { name: '碳燒脆皮大鵝（半隻）',   price: 1000, unit: '份', cat: 'whole' },
  { name: '碳燒脆皮大鵝（1/4隻）',  price: 550,  unit: '份', cat: 'whole' },
  { name: '碳燒脆皮大鴨（整隻）',   price: 1200, unit: '份', cat: 'whole' },
  { name: '碳燒脆皮大鴨（半隻）',   price: 650,  unit: '份', cat: 'whole' },
  { name: '碳燒脆皮大鴨（1/4隻）',  price: 350,  unit: '份', cat: 'whole' },
  { name: '玫瑰醬油雞（整隻）',     price: 750,  unit: '份', cat: 'whole' },
  { name: '玫瑰醬油雞（半隻）',     price: 380,  unit: '份', cat: 'whole' },
  { name: '玫瑰醬油雞（1/4隻）',    price: 290,  unit: '份', cat: 'whole' },
  { name: '碳燒原隻燒鵝腿',         price: 190,  unit: '份', cat: 'whole' },
  { name: '碳燒原隻燒鴨腿',         price: 140,  unit: '份', cat: 'whole' },
  { name: '原隻油雞腿',             price: 120,  unit: '份', cat: 'whole' },

  /* ── 秤重單點（每兩）── */
  { name: '碳燒脆皮燒肉', price: 40, unit: '兩', cat: 'weigh' },
  { name: '碳燒蜜汁叉燒', price: 40, unit: '兩', cat: 'weigh' },
  { name: '香港臘味',     price: 40, unit: '兩', cat: 'weigh' },
];

const BY_NAME = new Map(MENU.map((m) => [m.name, m]));

export function findItem(name) {
  return BY_NAME.get(String(name || '').trim()) || null;
}

const MAX_QTY = 99;
const MAX_LINES = 40;

/**
 * 驗證客人送來的購物車，並用「伺服器的價格」重算。
 * 回傳 { ok, items, total, boxes, error }
 */
export function priceCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, error: '點餐單是空的' };
  }
  if (rawItems.length > MAX_LINES) {
    return { ok: false, error: `品項太多（上限 ${MAX_LINES} 項），請分批下單` };
  }

  const items = [];
  const merged = new Map();

  for (const raw of rawItems) {
    const item = findItem(raw?.n ?? raw?.name);
    if (!item) {
      return { ok: false, error: `菜單上找不到「${raw?.n ?? raw?.name}」，可能已下架` };
    }
    const qty = Math.floor(Number(raw?.q ?? raw?.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: `「${item.name}」的份數不正確（1–${MAX_QTY}）` };
    }
    merged.set(item.name, (merged.get(item.name) || 0) + qty);
  }

  for (const [name, qty] of merged) {
    const item = findItem(name);
    const q = Math.min(qty, MAX_QTY);
    items.push({
      name: item.name,
      unit: item.unit,
      price: item.price, // ← 一律用伺服器的價格
      qty: q,
      subtotal: item.price * q,
    });
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  /* 「份數」只算便當/整隻，秤重的「兩」不列入外送門檻 */
  const boxes = items
    .filter((i) => i.unit !== '兩')
    .reduce((s, i) => s + i.qty, 0);

  return { ok: true, items, total, boxes };
}
