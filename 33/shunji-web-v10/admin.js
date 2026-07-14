/* ══════════════════════════════════════════════════════════════════════
   順記燒臘館 · 店家後台（admin.js）

   ★ 這個檔案「不用改」。要改的東西都在網頁上點一點就好。

   ────────────────────────────────────────────────────────────────
   怎麼進後台？
     手機 / 電腦都一樣 ── 在網址後面加上  #admin
       例：https://wsad952701-beep.github.io/123/13/#admin

     或者：連續快點網頁最下面的「順記燒臘館」店名 5 下。

   ────────────────────────────────────────────────────────────────
   帳號密碼（★ 一定要改掉！★）

     改下面那兩行就好。改完存檔上傳 GitHub。
   ──────────────────────────────────────────────────────────────── */

var ADMIN_USER = 'a123';          /* ← 改成你要的帳號 */
var ADMIN_PASS = '2640001';       /* ← 改成你要的密碼（★ 務必改掉）*/


/* ══════════════════════════════════════════════════════════════════════
   ↓↓↓ 以下是程式，不用看，也不用改 ↓↓↓
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var KEY_DATA = 'sj_menu_override';   /* 改過的價格 / 圖片 / 售完 */
var KEY_AUTH = 'sj_admin_auth';      /* 登入狀態（8 小時） */
var AUTH_TTL = 8 * 3600 * 1000;

/* ---------- 儲存層（隱私模式擋 localStorage 時用記憶體撐著）---------- */
var mem = {};
var ST = {
  get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return mem[k] || null; } },
  set: function(k,v){ try{ localStorage.setItem(k,v); }catch(e){ mem[k] = v; } },
  del: function(k){ try{ localStorage.removeItem(k); }catch(e){ delete mem[k]; } }
};

/* ---------- 覆寫資料 ----------
   {
     price   : { "順記三寶飯": 150, ... },       // 改過的價格
     sold    : { "碳燒脆皮大鵝（整隻）": 1 },      // 今日售完
     img     : { "assets/dish_sanbao.webp": "data:image/..." },  // 換過的圖
     hidden  : { "香港臘味": 1 }                  // 下架（整列不顯示）
   }
------------------------------------------------------------------ */
/* ★ 兩層：
     ① 已發佈的（menu-data.js，GitHub 上的）→ 全部客人都看得到
     ② 本機草稿（localStorage）              → 只有店家這台看得到
   讀的時候把兩層疊起來，②蓋過①。                                    */
function pub(){
  try{
    var d = (typeof MENU_DATA !== 'undefined' && MENU_DATA) ? MENU_DATA : {};
    return {
      price : d.price  || {},
      sold  : d.sold   || {},
      img   : d.img    || {},
      hidden: d.hidden || {},
      special: Array.isArray(d.special) ? d.special : [],
      qty   : d.qty    || {},
      soldToday: d.soldToday || {},
      notice: d.notice || '',
      noticeType: d.noticeType || 'info'
    };
  }catch(e){ return { price:{}, sold:{}, img:{}, hidden:{}, special:[], qty:{}, soldToday:{}, notice:'', noticeType:'info' }; }
}
function local(){
  try{
    var o = JSON.parse(ST.get(KEY_DATA) || 'null');
    if(!o || typeof o !== 'object') o = {};
  }catch(e){ o = {}; }
  o.price  = o.price  || {};
  o.sold   = o.sold   || {};
  o.img    = o.img    || {};
  o.hidden = o.hidden || {};
  o.special = Array.isArray(o.special) ? o.special : [];
  o.qty    = o.qty    || {};
  o.soldToday = o.soldToday || {};
  o.notice = o.notice || '';
  o.noticeType = o.noticeType || 'info';
  return o;
}
function merge(a, b){
  var r = {};
  Object.keys(a).forEach(function(k){ r[k] = a[k]; });
  Object.keys(b).forEach(function(k){ r[k] = b[k]; });
  return r;
}
function readOv(){
  var P = pub(), L = local();
  return {
    price : merge(P.price,  L.price),
    sold  : merge(P.sold,   L.sold),
    img   : merge(P.img,    L.img),
    hidden: merge(P.hidden, L.hidden),
    special: L.special.length ? L.special : P.special,
    qty   : merge(P.qty, L.qty),
    soldToday: merge(P.soldToday, L.soldToday),
    notice: L.notice || P.notice || '',
    noticeType: L.noticeType || P.noticeType || 'info'
  };
}
function writeOv(o){
  try{ ST.set(KEY_DATA, JSON.stringify(o)); }catch(e){
    alert('儲存失敗：圖片可能太大。\n請改用小一點的照片（建議壓到 300KB 以內）。');
  }
}

/* ★ 提供給 index.html 讀取：改過的價格要蓋掉原本的 data-price */
window.SJ_ADMIN = {
  data     : readOv,
  isSold   : function(n){
    var ov = readOv();
    if(ov.sold[n]) return true;
    /* v10：設了數量但已賣光 → 也視為售完 */
    if(typeof ov.qty[n] === 'number' && ov.qty[n] >= 0){
      var s = ov.soldToday[n] || 0;
      if(ov.qty[n] - s <= 0) return true;
    }
    return false;
  },
  isHidden : function(n){ return !!readOv().hidden[n]; },
  priceOf  : function(n, def){
    var p = readOv().price[n];
    return (typeof p === 'number' && p > 0) ? p : def;
  },
  imgOf    : function(src){
    var m = readOv().img;
    return m[src] || src;
  },
  specials : function(){ return readOv().special || []; },
  qtyOf    : function(n){ var q = readOv().qty[n]; return (typeof q === 'number' && q >= 0) ? q : -1; },
  soldOf   : function(n){ var s = readOv().soldToday[n]; return (typeof s === 'number' && s >= 0) ? s : 0; },
  remainOf : function(n){
    var ov = readOv();
    var q  = ov.qty[n];
    if(typeof q !== 'number' || q < 0) return -1;
    var s = ov.soldToday[n] || 0;
    return Math.max(0, q - s);
  },
  notice   : function(){ return { text: readOv().notice || '', type: readOv().noticeType || 'info' }; },
  /* 客人送出訂單後 → 記錄到本機（不會影響其他客人看到的庫存）*/
  logOrder : function(items){
    try{
      var log = JSON.parse(ST.get('sj_orders_log') || '[]');
      if(!Array.isArray(log)) log = [];
      log.unshift({
        t : Date.now(),
        items : items   /* [{n:品名, q:數量, p:單價}] */
      });
      /* 只保留最近 50 筆 */
      if(log.length > 50) log = log.slice(0, 50);
      ST.set('sj_orders_log', JSON.stringify(log));
    }catch(e){}
  },
  getOrders : function(){
    try{
      var log = JSON.parse(ST.get('sj_orders_log') || '[]');
      return Array.isArray(log) ? log : [];
    }catch(e){ return []; }
  }
};

/* ══════════════════════════════════════════════════════════════
   ① 套用覆寫 —— 網頁一載入就把新價格 / 新圖 / 售完標記刷上去
   ★ 必須在 index.html 的主程式掃描 data-price 之前跑完
   ══════════════════════════════════════════════════════════════ */
function applyOverrides(){
  var ov = readOv();

  /* --- 圖片 --- */
  document.querySelectorAll('img[src]').forEach(function(img){
    var raw = img.getAttribute('src');
    if(ov.img[raw]){
      img.setAttribute('data-orig-src', raw);
      img.src = ov.img[raw];
      img.removeAttribute('srcset');
    }
  });
  document.querySelectorAll('source[srcset]').forEach(function(s){
    var raw = s.getAttribute('srcset');
    if(ov.img[raw]) s.setAttribute('srcset', ov.img[raw]);
  });

  /* --- 價格：先把 data-price 改掉（主程式會讀它建 CATALOG）--- */
  document.querySelectorAll('[data-name][data-price]').forEach(function(b){
    var nm = b.getAttribute('data-name');
    var np = ov.price[nm];
    if(typeof np === 'number' && np > 0){
      b.setAttribute('data-price', String(np));
      /* 整隻/部位那種按鈕，價格顯示在按鈕裡的 <b> */
      var bold = b.querySelector('b');
      if(bold) bold.textContent = String(np);
    }
  });

  /* --- 價格：再把畫面上看得到的數字改掉 --- */
  /* 菜單列： <li class="m-row"> ... <span class="m-price"><small>NT$</small>220</span> <button data-name data-price> */
  document.querySelectorAll('#menuList .m-row').forEach(function(row){
    var btn = row.querySelector('.m-add[data-name]');
    if(!btn) return;
    var nm = btn.getAttribute('data-name');
    var np = ov.price[nm];
    if(typeof np === 'number' && np > 0){
      var el = row.querySelector('.m-price');
      if(el){
        /* 保留 <small>NT$</small> 和後面的 /兩，只換中間的數字 */
        var smalls = el.querySelectorAll('small');
        var pre  = smalls[0] ? smalls[0].outerHTML : '<small>NT$</small>';
        var post = smalls[1] ? smalls[1].outerHTML : '';
        el.innerHTML = pre + np + post;
      }
    }
  });

  /* 招牌主食卡： <span class="dish-price"><small>NT$</small>140</span> */
  document.querySelectorAll('.dish').forEach(function(card){
    var btn = card.querySelector('.dish-add[data-name]');
    if(!btn) return;
    var nm = btn.getAttribute('data-name');
    var np = ov.price[nm];
    if(typeof np === 'number' && np > 0){
      var el = card.querySelector('.dish-price');
      if(el) el.innerHTML = '<small>NT$</small>' + np;
    }
  });

  /* --- 下架：整列 / 整張卡藏起來 --- */
  document.querySelectorAll('#menuList .m-row').forEach(function(row){
    var names = [];
    row.querySelectorAll('[data-name]').forEach(function(b){ names.push(b.getAttribute('data-name')); });
    if(names.length && names.every(function(n){ return ov.hidden[n]; })){
      row.setAttribute('data-admin-hidden','1');
      row.style.display = 'none';
    }
  });
  document.querySelectorAll('.dish').forEach(function(card){
    var b = card.querySelector('.dish-add[data-name]');
    if(b && ov.hidden[b.getAttribute('data-name')]) card.style.display = 'none';
  });

  /* --- 售完：按鈕停用 + 打上「售完」標籤 ---
     ★ v10：如果設了「剩餘數量」而且已賣光了 → 自動視為售完 */
  document.querySelectorAll('[data-name]').forEach(function(b){
    var nm = b.getAttribute('data-name');
    var isSold = !!ov.sold[nm];
    if(!isSold && typeof ov.qty[nm] === 'number' && ov.qty[nm] >= 0){
      var soldCnt = ov.soldToday[nm] || 0;
      if(ov.qty[nm] - soldCnt <= 0) isSold = true;
    }
    if(!isSold) return;
    b.setAttribute('data-sold','1');           /* 主程式看到這個就不建步進器 */
  });
}

/* ══════════════════════════════════════════════════════════════
   ② 售完的視覺處理（要在主程式把按鈕換成步進器「之後」跑）
   ══════════════════════════════════════════════════════════════ */
function paintSold(){
  var ov = readOv();

  /* 收集所有需要標售完的品項：手動標的 + 賣光的 */
  var allSold = {};
  Object.keys(ov.sold).forEach(function(k){ if(ov.sold[k]) allSold[k] = 1; });
  Object.keys(ov.qty).forEach(function(k){
    if(typeof ov.qty[k] === 'number' && ov.qty[k] >= 0){
      var s = ov.soldToday[k] || 0;
      if(ov.qty[k] - s <= 0) allSold[k] = 1;
    }
  });

  Object.keys(allSold).forEach(function(nm){
    if(!allSold[nm]) return;

    /* 菜單列 */
    document.querySelectorAll('#menuList .m-row').forEach(function(row){
      var q = row.querySelector('.qty[data-for="'+cssq(nm)+'"], .m-varwrap[data-for="'+cssq(nm)+'"]');
      if(!q) return;
      q.classList.add('sold');
      if(!row.querySelector('.sold-tag')){
        var nameEl = row.querySelector('.m-name');
        if(nameEl){
          var t = document.createElement('span');
          t.className = 'm-tag sold-tag';
          t.textContent = '售完';
          nameEl.appendChild(t);
        }
      }
    });

    /* 招牌卡 */
    document.querySelectorAll('.dish').forEach(function(card){
      var q = card.querySelector('.qty[data-for="'+cssq(nm)+'"]');
      if(!q) return;
      card.classList.add('dish--sold');
      q.classList.add('sold');
      var rank = card.querySelector('.dish-rank');
      if(rank){ rank.textContent = '今日售完'; rank.style.background = '#8a2b2b'; }
    });
  });
}
function cssq(s){ return String(s).replace(/"/g,'\\"'); }

/* ══════════════════════════════════════════════════════════════
   ③ 後台面板
   ══════════════════════════════════════════════════════════════ */
var panel = null;
var LOGGED = false;

function authed(){
  try{
    var o = JSON.parse(ST.get(KEY_AUTH) || 'null');
    if(!o || !o.t) return false;
    if(Date.now() - o.t > AUTH_TTL){ ST.del(KEY_AUTH); return false; }
    return true;
  }catch(e){ return false; }
}
function setAuthed(){ ST.set(KEY_AUTH, JSON.stringify({ t: Date.now() })); LOGGED = true; }
function logout(){ ST.del(KEY_AUTH); LOGGED = false; location.hash = ''; location.reload(); }

function css(){
  if(document.getElementById('sjAdminCss')) return;
  var s = document.createElement('style');
  s.id = 'sjAdminCss';
  s.textContent = [
'.adm{position:fixed;inset:0;z-index:2000;background:rgba(12,9,7,.94);backdrop-filter:blur(6px);',
'  display:none;overflow-y:auto;padding:0;-webkit-overflow-scrolling:touch}',
'.adm.open{display:block}',
'.adm-wrap{max-width:760px;margin:0 auto;padding:16px 14px 90px;color:#efe6d8;font-size:15px}',
'.adm-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 0 12px;',
'  background:linear-gradient(180deg,rgba(12,9,7,.99) 70%,rgba(12,9,7,0));margin-bottom:6px}',
'.adm-top h2{flex:1;font-size:19px;font-weight:600;letter-spacing:.06em;color:#e8c988;margin:0}',
'.adm-x{width:38px;height:38px;border-radius:9px;border:1px solid rgba(232,201,136,.3);',
'  background:transparent;color:#e8c988;font-size:19px;cursor:pointer;flex:none}',
'.adm-x:hover{background:rgba(232,201,136,.14)}',
'.adm-out{padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.18);',
'  background:transparent;color:#bdb3a4;font-size:13px;cursor:pointer;flex:none}',
'.adm-out:hover{color:#fff;border-color:#fff}',
'/* 登入 */',
'.adm-login{max-width:340px;margin:12vh auto 0;text-align:center}',
'.adm-login h3{font-size:22px;color:#e8c988;margin:0 0 6px;font-weight:600;letter-spacing:.08em}',
'.adm-login p{color:#9a9086;font-size:13px;margin:0 0 24px;line-height:1.8}',
'.adm-in{width:100%;padding:14px 14px;margin-bottom:11px;border-radius:10px;font-size:16px;',
'  border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#fff;',
'  font-family:inherit;-webkit-appearance:none}',
'.adm-in:focus{outline:none;border-color:#d6a44e;background:rgba(255,255,255,.09)}',
'.adm-go{width:100%;padding:15px;margin-top:8px;border:0;border-radius:10px;cursor:pointer;',
'  background:linear-gradient(180deg,#e8c988,#d6a44e 55%,#b9873a);color:#2a1a06;',
'  font-size:16px;font-weight:700;letter-spacing:.12em;font-family:inherit}',
'.adm-go:hover{filter:brightness(1.08)}',
'.adm-err{color:#ff8f8f;font-size:13px;min-height:20px;margin-top:10px}',
'/* 內容 */',
'.adm-tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:3px}',
'.adm-tab{flex:none;padding:9px 15px;border-radius:999px;cursor:pointer;font-size:13.5px;',
'  border:1px solid rgba(255,255,255,.16);background:transparent;color:#a89e92;',
'  font-family:inherit;white-space:nowrap;letter-spacing:.04em}',
'.adm-tab[aria-selected="true"]{background:#d6a44e;border-color:#d6a44e;color:#2a1a06;font-weight:700}',
'.adm-hint{font-size:12.5px;color:#8b8177;line-height:1.85;margin:0 0 14px;padding:11px 13px;',
'  border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}',
'.adm-hint b{color:#e8c988;font-weight:600}',
'/* 品項列 */',
'.adm-row{display:grid;grid-template-columns:1fr 96px auto;gap:9px;align-items:center;',
'  padding:11px 12px;border-radius:10px;margin-bottom:7px;',
'  background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}',
'.adm-row.sold{opacity:.5}',
'.adm-row.hid{opacity:.32}',
'.adm-nm{font-size:14.5px;line-height:1.5;min-width:0}',
'.adm-nm b{display:block;font-weight:500;color:#f2eade;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.adm-nm em{font-style:normal;font-size:11.5px;color:#8b8177;letter-spacing:.05em}',
'.adm-nm em.chg{color:#7fd88f}',
'.adm-p{display:flex;align-items:center;gap:4px}',
'.adm-p span{font-size:11px;color:#8b8177;flex:none}',
'.adm-p input{width:100%;padding:9px 8px;border-radius:8px;text-align:right;font-size:15px;',
'  border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.3);color:#fff;',
'  font-family:var(--num,inherit);-webkit-appearance:none;-moz-appearance:textfield}',
'.adm-p input:focus{outline:none;border-color:#d6a44e}',
'.adm-p input.chg{border-color:#5aa86c;color:#9ff0b0;background:rgba(90,168,108,.12)}',
'.adm-acts{display:flex;gap:5px;flex:none}',
'.adm-b{width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:14px;',
'  border:1px solid rgba(255,255,255,.15);background:transparent;color:#a89e92;',
'  display:grid;place-items:center;font-family:inherit;padding:0}',
'.adm-b:hover{color:#fff;border-color:#fff}',
'.adm-b.on{background:#a8181c;border-color:#a8181c;color:#fff}',
'.adm-b.on2{background:#5a5148;border-color:#5a5148;color:#fff}',
'/* 圖片 */',
'.adm-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:11px}',
'.adm-img{border-radius:11px;overflow:hidden;background:rgba(255,255,255,.05);',
'  border:1px solid rgba(255,255,255,.08);position:relative}',
'.adm-img img{width:100%;aspect-ratio:5/4;object-fit:cover;display:block;background:#1a1512}',
'.adm-img.chg{border-color:#5aa86c;box-shadow:0 0 0 1px #5aa86c}',
'.adm-img figcaption{padding:8px 9px;font-size:11.5px;color:#a89e92;line-height:1.5;',
'  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.adm-img .r{position:absolute;top:6px;right:6px;background:#5aa86c;color:#fff;',
'  font-size:10px;padding:3px 7px;border-radius:5px;letter-spacing:.06em}',
'.adm-imgbtns{display:flex;gap:5px;padding:0 8px 8px}',
'.adm-imgbtns button,.adm-imgbtns label{flex:1;padding:7px;border-radius:7px;cursor:pointer;',
'  font-size:11.5px;text-align:center;border:1px solid rgba(255,255,255,.15);',
'  background:transparent;color:#a89e92;font-family:inherit}',
'.adm-imgbtns label:hover,.adm-imgbtns button:hover{color:#fff;border-color:#fff}',
'.adm-imgbtns input{display:none}',
'/* 底部 */',
'.adm-bar{position:fixed;left:0;right:0;bottom:0;z-index:10;padding:11px 14px calc(11px + env(safe-area-inset-bottom));',
'  background:rgba(12,9,7,.97);border-top:1px solid rgba(255,255,255,.1);',
'  display:flex;gap:8px;max-width:760px;margin:0 auto}',
'.adm-save{flex:1;padding:14px;border:0;border-radius:10px;cursor:pointer;font-family:inherit;',
'  background:linear-gradient(180deg,#e8c988,#d6a44e 55%,#b9873a);color:#2a1a06;',
'  font-size:15.5px;font-weight:700;letter-spacing:.1em}',
'.adm-save:hover{filter:brightness(1.08)}',
'.adm-reset{padding:14px 16px;border-radius:10px;cursor:pointer;font-family:inherit;flex:none;',
'  border:1px solid rgba(255,255,255,.2);background:transparent;color:#a89e92;font-size:13.5px}',
'.adm-reset:hover{color:#ff9a9a;border-color:#ff9a9a}',
'/* 售完的樣子（前台）*/',
'.qty.sold,.m-varwrap.sold{opacity:.34;pointer-events:none;filter:grayscale(1)}',
'.sold-tag{background:#8a2b2b !important;color:#fff !important;border-color:#8a2b2b !important}',
'.dish--sold .dish-img img{filter:grayscale(.85) brightness(.72)}',
'/* 發佈 */',
'.adm-pub{margin-top:16px}',
'.adm-pub textarea{width:100%;height:150px;padding:11px;border-radius:9px;font-size:11px;',
'  border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#9ff0b0;',
'  font-family:ui-monospace,Menlo,monospace;resize:vertical;line-height:1.6}',
'.adm-pub .b2{display:flex;gap:7px;margin-top:9px}',
'.adm-pub .b2 button{flex:1;padding:11px;border-radius:8px;cursor:pointer;font-size:13px;',
'  border:1px solid rgba(255,255,255,.18);background:transparent;color:#d6c8b4;font-family:inherit}',
'.adm-pub .b2 button:hover{color:#fff;border-color:#fff}',
'/* 提示 */',
'.adm-toast{position:fixed;left:50%;bottom:88px;transform:translate(-50%,14px);z-index:2100;',
'  padding:12px 20px;border-radius:999px;background:#e8c988;color:#2a1a06;font-weight:600;',
'  font-size:14px;opacity:0;pointer-events:none;transition:.28s;box-shadow:0 10px 30px -8px rgba(0,0,0,.7)}',
'.adm-toast.show{opacity:1;transform:translate(-50%,0)}',
'@media(max-width:520px){',
'  .adm-row{grid-template-columns:1fr 84px auto;gap:7px;padding:10px}',
'  .adm-nm{font-size:13.5px}',
'  .adm-imgs{grid-template-columns:repeat(2,1fr);gap:9px}',
'}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ---- 收集畫面上所有品項（一律以 HTML 上的 data-price 為「原價」）---- */
var ORIG = [];   /* [{name, base, unit, cat}] */
var ORIG_IMG = [];  /* [{src, label}] */

function scan(){
  ORIG = []; ORIG_IMG = [];
  var seen = {};

  var CATN = { rice:'招牌飯類', bbq:'燒味飯', whole:'整隻・部位', weigh:'秤重單點' };

  document.querySelectorAll('#menuList .m-row').forEach(function(row){
    var cat = row.getAttribute('data-cat');
    row.querySelectorAll('[data-name][data-price]').forEach(function(b){
      var n = b.getAttribute('data-name');
      if(!n || seen[n]) return;
      seen[n] = 1;
      ORIG.push({
        name : n,
        base : parseInt(b.getAttribute('data-price'), 10),
        unit : b.getAttribute('data-unit') || '份',
        cat  : CATN[cat] || '其他'
      });
    });
  });
  /* 招牌卡（可能已在菜單出現過，去重）*/
  document.querySelectorAll('.dish-add[data-name][data-price]').forEach(function(b){
    var n = b.getAttribute('data-name');
    if(!n || seen[n]) return;
    seen[n] = 1;
    ORIG.push({ name:n, base:parseInt(b.getAttribute('data-price'),10), unit:'份', cat:'招牌主食' });
  });

  /* 圖片：只列「有意義」的（招牌卡 + 菜單海報 + 主視覺）*/
  var IMGLBL = {
    'assets/dish_sanbao.webp'   : '招牌卡：順記三寶飯',
    'assets/dish_duckleg.webp'  : '招牌卡：燒鴨腿飯',
    'assets/dish_plate.webp'    : '招牌卡：順記雙拼飯',
    'assets/menu_poster.webp'   : '菜單海報',
    'assets/hero_goose.webp'    : '首頁主視覺',
    'assets/poster_main.webp'   : '主海報',
    'assets/menu_card.webp'     : '菜單卡',
    'assets/dish_bento.webp'    : '便當',
    'assets/dish_platter.webp'  : '拼盤',
    'assets/shop_street.webp'   : '店面・街景',
    'assets/shop_window.webp'   : '店面・櫥窗',
    'assets/shop_interior.webp' : '店內',
    'assets/shop_counter.webp'  : '出餐台',
    'assets/duck_glass.webp'    : '玻璃櫃燒味',
    'assets/craft_fire.webp'    : '工序・炭火',
    'assets/craft_carve.webp'   : '工序・分切',
    'assets/craft_rack.webp'    : '工序・掛爐',
    'assets/craft_marinate.webp': '工序・醃製',
    'assets/ing_goose.webp'     : '食材・鵝',
    'assets/ing_duck.webp'      : '食材・鴨',
    'assets/ing_pork.webp'      : '食材・豬',
    'assets/ing_siuyuk.webp'    : '食材・燒肉',
    'assets/poster_ing.webp'    : '食材海報',
    'assets/qr_line.webp'       : 'LINE QR Code'
  };
  var iseen = {};
  document.querySelectorAll('img[src]').forEach(function(img){
    var raw = img.getAttribute('data-orig-src') || img.getAttribute('src');
    if(!raw || raw.indexOf('assets/') !== 0) return;
    if(iseen[raw]) return;
    iseen[raw] = 1;
    ORIG_IMG.push({ src: raw, label: IMGLBL[raw] || raw.replace('assets/','') });
  });
  /* 讓招牌卡的三張排最前面 */
  var ORDER = ['assets/dish_sanbao.webp','assets/dish_duckleg.webp','assets/dish_plate.webp','assets/menu_poster.webp','assets/hero_goose.webp'];
  ORIG_IMG.sort(function(a,b){
    var ia = ORDER.indexOf(a.src), ib = ORDER.indexOf(b.src);
    if(ia < 0) ia = 99; if(ib < 0) ib = 99;
    return ia - ib;
  });
}

/* ---- 面板 HTML ---- */
function build(){
  css();
  if(panel) return;
  panel = document.createElement('div');
  panel.className = 'adm';
  panel.id = 'admPanel';
  panel.innerHTML =
    '<div class="adm-wrap">' +
      /* 登入 */
      '<div id="admLogin" class="adm-login">' +
        '<h3>店家後台</h3>' +
        '<p>登入後可以直接改價格、換照片、標售完。<br>改完按「儲存並套用」，網頁立刻更新。</p>' +
        '<input class="adm-in" id="admU" type="text" placeholder="帳號" autocomplete="username" autocapitalize="off" spellcheck="false">' +
        '<input class="adm-in" id="admP" type="password" placeholder="密碼" autocomplete="current-password">' +
        '<button class="adm-go" id="admGo" type="button">登　入</button>' +
        '<p class="adm-err" id="admErr"></p>' +
        '<p style="margin-top:26px"><button class="adm-out" id="admBack" type="button">← 回到網站</button></p>' +
      '</div>' +

      /* 主畫面 */
      '<div id="admMain" style="display:none">' +
        '<div class="adm-top">' +
          '<h2>店家後台</h2>' +
          '<button class="adm-out" id="admLogout" type="button">登出</button>' +
          '<button class="adm-x" id="admX" type="button" aria-label="關閉">✕</button>' +
        '</div>' +

        '<div class="adm-tabs" role="tablist">' +
          '<button class="adm-tab" role="tab" data-k="price" aria-selected="true">價格・售完・下架</button>' +
          '<button class="adm-tab" role="tab" data-k="img" aria-selected="false">換照片</button>' +
          '<button class="adm-tab" role="tab" data-k="pub" aria-selected="false">發佈給客人</button>' +
        '</div>' +

        '<div id="admPrice">' +
          '<p class="adm-hint">直接改數字就好。<br>' +
          '<b>🚫</b>＝今日售完（客人看得到，但不能點）　<b>👁</b>＝下架（整個藏起來）</p>' +
          '<div id="admList"></div>' +
        '</div>' +

        '<div id="admImg" style="display:none">' +
          '<p class="adm-hint">按「換照片」→ 從手機相簿選一張，馬上就換好。<br>' +
          '照片建議先壓到 <b>1MB 以內</b>（太大存不進去）。系統會自動幫你縮到 1200px。</p>' +
          '<div class="adm-imgs" id="admImgs"></div>' +
        '</div>' +

        '<div id="admPub" style="display:none">' +
          '<p class="adm-hint">' +
          '⚠️ <b>重要</b>：上面改的東西<b>只存在這支手機／這台電腦</b>，客人看到的還是舊的。<br><br>' +
          '要讓<b>所有客人</b>都看到新價格：<br>' +
          '① 按「複製設定碼」<br>' +
          '② 到 GitHub 開 <b>menu-data.js</b>（沒有就新建一個）<br>' +
          '③ 把裡面全部刪掉，貼上剛複製的內容 → Commit<br>' +
          '④ 等 2 分鐘，全部客人的網頁就更新了</p>' +
          '<div class="adm-pub">' +
            '<textarea id="admCode" readonly spellcheck="false"></textarea>' +
            '<div class="b2">' +
              '<button id="admCopy" type="button">📋 複製設定碼</button>' +
              '<button id="admDl" type="button">⬇ 下載 menu-data.js</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="adm-bar" id="admBar" style="display:none">' +
      '<button class="adm-save" id="admSave" type="button">儲存並套用</button>' +
      '<button class="adm-reset" id="admReset" type="button">全部復原</button>' +
    '</div>' +

    '<div class="adm-toast" id="admToast"></div>';

  document.body.appendChild(panel);
  wire();
}

function atoast(m){
  var t = document.getElementById('admToast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(atoast._t);
  atoast._t = setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

/* ---- 草稿（按「儲存」才寫進去）---- */
var DRAFT = null;

function renderList(){
  var box = document.getElementById('admList');
  var byCat = {};
  ORIG.forEach(function(it){ (byCat[it.cat] = byCat[it.cat] || []).push(it); });

  var html = '';
  Object.keys(byCat).forEach(function(cat){
    html += '<p style="margin:16px 0 8px;font-size:12px;letter-spacing:.18em;color:#8b8177">' + cat + '</p>';
    byCat[cat].forEach(function(it){
      var cur   = DRAFT.price[it.name];
      var price = (typeof cur === 'number' && cur > 0) ? cur : it.base;
      var chg   = price !== it.base;
      var sold  = !!DRAFT.sold[it.name];
      var hid   = !!DRAFT.hidden[it.name];

      html +=
        '<div class="adm-row' + (sold ? ' sold' : '') + (hid ? ' hid' : '') + '" data-n="' + esc(it.name) + '">' +
          '<div class="adm-nm">' +
            '<b>' + esc(it.name) + '</b>' +
            '<em class="' + (chg ? 'chg' : '') + '">' +
              (chg ? ('原 ' + it.base + ' → ' + price) : ('NT$' + it.base)) + ' / ' + esc(it.unit) +
            '</em>' +
          '</div>' +
          '<div class="adm-p">' +
            '<span>$</span>' +
            '<input type="number" inputmode="numeric" min="0" max="99999" step="1" ' +
                   'class="' + (chg ? 'chg' : '') + '" value="' + price + '" data-n="' + esc(it.name) + '">' +
          '</div>' +
          '<div class="adm-acts">' +
            '<button class="adm-b' + (sold ? ' on' : '') + '" data-act="sold" data-n="' + esc(it.name) + '" title="今日售完">🚫</button>' +
            '<button class="adm-b' + (hid  ? ' on2' : '') + '" data-act="hide" data-n="' + esc(it.name) + '" title="下架">👁</button>' +
          '</div>' +
        '</div>';
    });
  });
  box.innerHTML = html;

  box.querySelectorAll('input[type=number]').forEach(function(i){
    i.addEventListener('input', function(){
      var n = i.getAttribute('data-n');
      var v = parseInt(i.value, 10);
      var o = ORIG.filter(function(x){ return x.name === n; })[0];
      if(!o) return;
      if(!(v > 0)){ delete DRAFT.price[n]; }
      else if(v === o.base){ delete DRAFT.price[n]; }
      else { DRAFT.price[n] = v; }

      var chg = (v > 0 && v !== o.base);
      i.classList.toggle('chg', chg);
      var em = i.closest('.adm-row').querySelector('em');
      em.className = chg ? 'chg' : '';
      em.textContent = (chg ? ('原 ' + o.base + ' → ' + v) : ('NT$' + o.base)) + ' / ' + o.unit;
    });
  });

  box.querySelectorAll('.adm-b').forEach(function(b){
    b.addEventListener('click', function(){
      var n = b.getAttribute('data-n');
      var a = b.getAttribute('data-act');
      var row = b.closest('.adm-row');
      if(a === 'sold'){
        if(DRAFT.sold[n]) delete DRAFT.sold[n]; else DRAFT.sold[n] = 1;
        b.classList.toggle('on', !!DRAFT.sold[n]);
        row.classList.toggle('sold', !!DRAFT.sold[n]);
      }else{
        if(DRAFT.hidden[n]) delete DRAFT.hidden[n]; else DRAFT.hidden[n] = 1;
        b.classList.toggle('on2', !!DRAFT.hidden[n]);
        row.classList.toggle('hid', !!DRAFT.hidden[n]);
      }
    });
  });
}

function renderImgs(){
  var box = document.getElementById('admImgs');
  box.innerHTML = ORIG_IMG.map(function(im, i){
    var cur = DRAFT.img[im.src];
    return '<figure class="adm-img' + (cur ? ' chg' : '') + '" data-src="' + esc(im.src) + '" style="margin:0">' +
             (cur ? '<span class="r">已更換</span>' : '') +
             '<img src="' + esc(cur || im.src) + '" alt="" loading="lazy">' +
             '<figcaption>' + esc(im.label) + '</figcaption>' +
             '<div class="adm-imgbtns">' +
               '<label>換照片<input type="file" accept="image/*" data-i="' + i + '"></label>' +
               (cur ? '<button type="button" data-undo="' + i + '">復原</button>' : '') +
             '</div>' +
           '</figure>';
  }).join('');

  box.querySelectorAll('input[type=file]').forEach(function(inp){
    inp.addEventListener('change', function(){
      var f = inp.files && inp.files[0];
      if(!f) return;
      var src = ORIG_IMG[+inp.getAttribute('data-i')].src;
      shrink(f, function(dataUrl, kb){
        if(kb > 1400){
          alert('這張照片太大了（約 ' + Math.round(kb) + ' KB）。\n請換一張小一點的，或先用手機的「編輯 → 裁切」縮小。');
          return;
        }
        DRAFT.img[src] = dataUrl;
        renderImgs();
        atoast('照片已換好，記得按「儲存並套用」');
      });
    });
  });

  box.querySelectorAll('[data-undo]').forEach(function(b){
    b.addEventListener('click', function(){
      delete DRAFT.img[ORIG_IMG[+b.getAttribute('data-undo')].src];
      renderImgs();
    });
  });
}

/* 圖片縮小 + 轉 base64（存得進 localStorage）*/
function shrink(file, cb){
  var fr = new FileReader();
  fr.onload = function(){
    var img = new Image();
    img.onload = function(){
      var MAX = 1200;
      var w = img.width, h = img.height;
      if(w > MAX || h > MAX){
        var r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);

      var out = '';
      /* 從 0.82 開始，太大就一路壓下去 */
      [0.82, 0.7, 0.6, 0.5, 0.42].some(function(q){
        out = cv.toDataURL('image/jpeg', q);
        return (out.length * 0.75 / 1024) < 900;
      });
      cb(out, out.length * 0.75 / 1024);
    };
    img.onerror = function(){ alert('這個檔案不是圖片，或已損毀。'); };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function renderPub(){
  var d = {
    price  : DRAFT.price,
    sold   : DRAFT.sold,
    hidden : DRAFT.hidden,
    img    : DRAFT.img,
    special: DRAFT.special || [],
    qty    : DRAFT.qty || {},
    notice : DRAFT.notice || '',
    noticeType : DRAFT.noticeType || 'info'
  };
  var big = JSON.stringify(d.img).length > 200;
  var code =
    '/* 順記燒臘館 · 菜單設定（後台自動產生，' + new Date().toLocaleString('zh-TW') + '）\n' +
    '   ★ 不要手動改。要改請進網站 #admin 後台，改完再複製一份新的貼過來。 */\n' +
    'var MENU_DATA = ' + JSON.stringify(d, null, 1) + ';\n';

  document.getElementById('admCode').value = code;
  return code;
}

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- 綁事件 ---- */
function wire(){
  var $ = function(i){ return document.getElementById(i); };

  function doLogin(){
    var u = $('admU').value.trim();
    var p = $('admP').value;
    if(u === ADMIN_USER && p === ADMIN_PASS){
      setAuthed();
      enter();
    }else{
      $('admErr').textContent = '帳號或密碼不對';
      $('admP').value = '';
      $('admP').focus();
    }
  }
  $('admGo').addEventListener('click', doLogin);
  $('admP').addEventListener('keydown', function(e){ if(e.key === 'Enter') doLogin(); });
  $('admU').addEventListener('keydown', function(e){ if(e.key === 'Enter') $('admP').focus(); });
  $('admBack').addEventListener('click', close_);
  $('admX').addEventListener('click', close_);
  $('admLogout').addEventListener('click', function(){
    if(confirm('要登出後台嗎？\n（已儲存的設定不會消失）')) logout();
  });

  /* 頁籤 */
  panel.querySelectorAll('.adm-tab').forEach(function(t){
    t.addEventListener('click', function(){
      var k = t.getAttribute('data-k');
      panel.querySelectorAll('.adm-tab').forEach(function(x){
        x.setAttribute('aria-selected', String(x === t));
      });
      $('admPrice').style.display = (k === 'price') ? 'block' : 'none';
      $('admImg').style.display   = (k === 'img')   ? 'block' : 'none';
      $('admPub').style.display   = (k === 'pub')   ? 'block' : 'none';
      if(k === 'img') renderImgs();
      if(k === 'pub') renderPub();
      panel.scrollTop = 0;
    });
  });

  /* 儲存 */
  $('admSave').addEventListener('click', function(){
    writeOv(DRAFT);
    atoast('✓ 已儲存，正在套用…');
    setTimeout(function(){ location.reload(); }, 700);
  });

  /* 全部復原 */
  $('admReset').addEventListener('click', function(){
    if(!confirm('要把所有改過的價格、照片、售完標記全部清掉，\n回到原本的樣子嗎？')) return;
    ST.del(KEY_DATA);
    atoast('已全部復原，正在重新整理…');
    setTimeout(function(){ location.reload(); }, 700);
  });

  /* 複製設定碼 */
  $('admCopy').addEventListener('click', function(){
    var code = renderPub();
    var b = this;
    copy(code).then(function(ok){
      b.textContent = ok ? '✓ 已複製！去 GitHub 貼上' : '複製失敗，請手動全選';
      setTimeout(function(){ b.textContent = '📋 複製設定碼'; }, 2200);
    });
  });

  /* 下載 */
  $('admDl').addEventListener('click', function(){
    var code = renderPub();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
    a.download = 'menu-data.js';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
    atoast('已下載 menu-data.js');
  });
}

function copy(t){
  return new Promise(function(res){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(function(){ res(true); }).catch(function(){ res(fb()); });
    } else res(fb());
    function fb(){
      try{
        var ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.top = '-9999px';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 999999);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      }catch(e){ return false; }
    }
  });
}

/* ---- 開 / 關 ---- */
function enter(){
  DRAFT = readOv();
  scan();
  document.getElementById('admLogin').style.display = 'none';
  document.getElementById('admMain').style.display  = 'block';
  document.getElementById('admBar').style.display   = 'flex';
  renderList();
  panel.scrollTop = 0;
}

function open_(){
  build();
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';
  if(authed()) enter();
  else{
    document.getElementById('admLogin').style.display = 'block';
    document.getElementById('admMain').style.display  = 'none';
    document.getElementById('admBar').style.display   = 'none';
    setTimeout(function(){ document.getElementById('admU').focus(); }, 120);
  }
}
function close_(){
  if(panel) panel.classList.remove('open');
  document.body.style.overflow = '';
  if(location.hash === '#admin'){
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* ══════════════════════════════════════════════════════════════
   ④ 開機
   ══════════════════════════════════════════════════════════════ */

/* ★ 時序很重要：
     admin.js 在 <head> 載入，主程式在 </body> 前才跑。
     覆寫必須「早於」主程式掃描 data-price —— 所以主程式會在
     一開頭就自己呼叫 SJ_ADMIN.apply()（見 index.html）。
     這裡再保險一次，避免主程式改壞時整個菜單失效。            */
var APPLIED = false;
function applyOnce(){
  if(APPLIED) return;
  APPLIED = true;
  applyOverrides();
}
window.SJ_ADMIN.apply = applyOnce;

if(document.readyState !== 'loading') applyOnce();

/* 主程式跑完後再刷售完的樣子 */
window.addEventListener('load', function(){ setTimeout(paintSold, 60); });

/* 入口 ①：網址 #admin */
function checkHash(){ if(location.hash === '#admin') open_(); }
window.addEventListener('hashchange', checkHash);
window.addEventListener('DOMContentLoaded', checkHash);
if(document.readyState !== 'loading') checkHash();

/* 入口 ②：連點頁尾店名 5 下 */
window.addEventListener('load', function(){
  var hits = 0, t;
  document.querySelectorAll('.foot-brand, .f-brand, footer h3, footer .brand, .logo').forEach(function(el){
    el.style.cursor = 'default';
    el.addEventListener('click', function(){
      hits++;
      clearTimeout(t);
      t = setTimeout(function(){ hits = 0; }, 900);
      if(hits >= 5){ hits = 0; open_(); }
    });
  });
});

/* 讓 index.html 也能叫得動 */
window.SJ_ADMIN.open = open_;
window.SJ_ADMIN.paintSold = paintSold;

})();
