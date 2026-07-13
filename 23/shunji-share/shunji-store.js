/*!
 * shunji-store.js — 菜單資料 + 後台登入
 *
 * 三個頁面共用這一個檔：
 *   index.html  客人點餐（讀商品：圖片 / 價格 / 剩餘數量）
 *   admin.html  後台（登入後改商品與設定）
 *   order.html  訂單完成（讀店家設定：品牌 / LOGO / 社群連結）
 *
 * 資料從哪來（由上往下找，找到就用）：
 *   1. 這台裝置的後台編輯   localStorage['shunji_menu_local']    ← 還沒發佈的
 *   2. 網站上的菜單檔       ./data/menu.json                     ← 全部客人看到的
 *   3. 下面的 DEFAULTS      ← 前兩個都沒有時的預設值
 */
(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     ① 後台帳號密碼 —— 要改帳號改這裡；要改密碼請用後台的「變更密碼」，
        它會算好新的 hash 給你貼回來（貼回來才會全裝置生效）。
     ══════════════════════════════════════════════════════════════════ */
  var ADMIN = {
    user: 'a032640001',
    salt: 'shunji@2026',
    // sha256('shunji@2026' + ':' + 'qq1111')  ← 目前密碼是 qq1111
    hash: '2a2bccdb0c8431064bec9fe5eb7d5e6a131221a5f54c36ab3f7bc1403b14770a'
  };

  /* ══════════════════════════════════════════════════════════════════
     ② 預設菜單 —— 只有在 data/menu.json 讀不到時才會用到
     ══════════════════════════════════════════════════════════════════ */
  var DEFAULTS = {
    version: 1,
    updatedAt: '',
    settings: {
      brand: '順記',
      brandSub: '碳燒燒鵝 · 線上點餐',
      logo: '',                 // 店家 LOGO（會印在訂單圖片上）
      hero: '',                 // 點餐頁最上面的主視覺
      notice: '',               // 公告（例：今日 20:00 收單）
      communityUrl: '',         // LINE 社群連結
      footer: '此圖為訂單內容，請商家回覆確認',
      codePrefix: 'SJ',
      modes: ['外送', '自取', '內用'],
      minOrder: 0               // 外送最低消費，0 = 不限
    },
    items: [
      { id: 'p1', name: '碳燒原隻燒鵝腿飯', desc: '帶皮鵝腿 · 附例湯', cat: '飯類', price: 220, stock: null, img: '', on: true },
      { id: 'p2', name: '燒鵝拼叉燒飯',     desc: '雙拼 · 附例湯',     cat: '飯類', price: 180, stock: 20,   img: '', on: true },
      { id: 'p3', name: '半隻碳燒燒鵝',     desc: '現斬 · 約需 20 分鐘', cat: '單點', price: 780, stock: 8,  img: '', on: true },
      { id: 'p4', name: '老火例湯',         desc: '每日一款',           cat: '湯品', price: 60,  stock: null, img: '', on: true },
      { id: 'p5', name: '港式凍檸茶',       desc: '微糖 · 去冰可備註',   cat: '飲料', price: 45,  stock: null, img: '', on: true }
    ]
  };

  /* ═══════════════════════════════════════════════════════ localStorage */

  var K = {
    local:  'shunji_menu_local',   // 後台在這台裝置改的（未發佈）
    remote: 'shunji_menu_remote',  // 上次抓到的 data/menu.json 快取
    auth:   'shunji_auth',         // 登入狀態
    cred:   'shunji_cred',         // 這台裝置改過的帳密
    gh:     'shunji_gh'            // GitHub 一鍵發佈設定
  };

  function lsGet(k) {
    try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
    catch (e) { return null; }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) {
      // 多半是圖片塞爆了（一般瀏覽器只給 5MB 左右）
      if (e && /quota|exceed/i.test(e.name + e.message)) {
        throw new Error('瀏覽器空間不足，存不下。請把商品圖片刪掉幾張，或改用小一點的圖。');
      }
      throw e;
    }
  }

  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* ═══════════════════════════════════════════════════════════ SHA-256 */

  function utf8Bytes(str) {
    var out = [], i, c, c2, cp;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length &&
               (c2 = str.charCodeAt(i + 1)) >= 0xdc00 && c2 <= 0xdfff) {
        cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        i++;
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  var SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256(str) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var b = utf8Bytes(str), bits = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    var hi = Math.floor(bits / 4294967296), lo = bits >>> 0;
    b.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
           (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

    var w = new Array(64), i, j, a, bb, c, d, e, f, g, h, s0, s1, t1, t2;
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++)
        w[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      for (j = 16; j < 64; j++) {
        s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      a = H[0]; bb = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
      for (j = 0; j < 64; j++) {
        s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        t1 = (h + s1 + ((e & f) ^ (~e & g)) + SHA_K[j] + w[j]) | 0;
        s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        t2 = (s0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* ══════════════════════════════════════════════════════════ 資料組裝 */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // 補齊缺欄位，避免舊資料 / 手改壞的 JSON 讓頁面整個掛掉
  function normalize(d) {
    var out = clone(DEFAULTS);
    if (!d || typeof d !== 'object') return out;

    if (d.settings && typeof d.settings === 'object') {
      for (var k in out.settings)
        if (Object.prototype.hasOwnProperty.call(d.settings, k) && d.settings[k] != null)
          out.settings[k] = d.settings[k];
    }
    if (!Array.isArray(out.settings.modes) || !out.settings.modes.length)
      out.settings.modes = ['外送', '自取', '內用'];
    out.settings.minOrder = num(out.settings.minOrder, 0);

    if (Array.isArray(d.items)) {
      out.items = d.items.map(function (it, i) {
        return {
          id:    String(it && it.id ? it.id : 'p' + (i + 1)),
          name:  String(it && it.name ? it.name : '未命名'),
          desc:  String(it && it.desc ? it.desc : ''),
          cat:   String(it && it.cat ? it.cat : ''),
          price: num(it && it.price, 0),
          stock: (it && it.stock === 0) ? 0 : (it && it.stock != null && it.stock !== '' ? num(it.stock, null) : null),
          img:   String(it && it.img ? it.img : ''),
          on:    !(it && it.on === false)
        };
      });
    }
    out.version   = num(d.version, 1);
    out.updatedAt = String(d.updatedAt || '');
    return out;
  }

  function num(v, fb) {
    var n = parseInt(v, 10);
    return isNaN(n) ? fb : n;
  }

  var state = {
    remote: lsGet(K.remote),   // data/menu.json 的快取
    local:  lsGet(K.local),    // 後台未發佈的編輯
    cache:  null,              // normalize 過的結果（圖片很肥，不要每次重算）
    json:   null,              // 序列化結果，同上
    fetched: false,
    listeners: []
  };

  function data() {
    if (!state.cache) state.cache = normalize(state.local || state.remote || DEFAULTS);
    return state.cache;
  }

  // 要改資料就用這個拿一份可以隨便動的副本，改完丟給 save()
  function edit() { return clone(data()); }

  function invalidate() { state.cache = null; state.json = null; }

  function fire() {
    invalidate();
    var d = data();
    state.listeners.forEach(function (fn) { try { fn(d); } catch (e) {} });
  }

  /* 抓網站上的菜單檔（客人看到的那份）。file:// 開啟會失敗 → 自動退回快取／預設值 */
  function refresh() {
    if (typeof fetch !== 'function') return Promise.resolve(data());
    return fetch('./data/menu.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (j) {
        state.remote = j;
        state.fetched = true;
        try { lsSet(K.remote, j); } catch (e) {}
        if (!state.local) fire();          // 沒有本機編輯 → 直接吃新的
        return data();
      })
      .catch(function () { state.fetched = false; return data(); });
  }

  /* ══════════════════════════════════════════════════════════════ 圖片 */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 沒放圖的商品 → 用品名第一個字做一張金字暗底的圖，不會開天窗
  function placeholder(name) {
    var ch = esc((String(name || '順').trim().charAt(0)) || '順');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1D160F"/><stop offset="1" stop-color="#100C09"/></linearGradient></defs>' +
      '<rect width="480" height="360" fill="url(#g)"/>' +
      '<rect x="10" y="10" width="460" height="340" fill="none" stroke="rgba(231,203,146,.16)" stroke-width="2"/>' +
      '<text x="240" y="228" text-anchor="middle" font-family="Songti TC,Noto Serif TC,serif" ' +
      'font-size="150" fill="rgba(231,203,146,.42)">' + ch + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function imgOf(it) { return (it && it.img) ? it.img : placeholder(it && it.name); }

  /* 選了圖 → 縮小 + 壓縮成 dataURL（不然 localStorage 一下就爆） */
  function readImage(file, opt) {
    opt = opt || {};
    var max = opt.max || 900;
    var type = opt.type || 'image/jpeg';
    var q = opt.quality || 0.78;

    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('沒有選到檔案'));
      if (!/^image\//.test(file.type)) return rej(new Error('這不是圖片檔，請選 JPG 或 PNG'));

      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) return rej(new Error('圖片讀不出來，換一張試試'));
        var s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * s));
        c.height = Math.max(1, Math.round(h * s));
        var cx = c.getContext('2d');
        if (type === 'image/jpeg') {            // JPEG 沒有透明 → 先鋪底色
          cx.fillStyle = '#14100C';
          cx.fillRect(0, 0, c.width, c.height);
        }
        cx.drawImage(img, 0, 0, c.width, c.height);
        try { res(c.toDataURL(type, q)); }
        catch (e) { rej(new Error('圖片處理失敗，換一張試試')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('圖片讀取失敗，換一張試試')); };
      img.src = url;
    });
  }

  /* ══════════════════════════════════════════════════════════════ 登入 */

  function cred() {
    var c = lsGet(K.cred);
    return (c && c.user && c.hash && c.salt) ? c : ADMIN;
  }

  function login(user, pass) {
    var c = cred();
    var ok = String(user || '').trim() === c.user && sha256(c.salt + ':' + String(pass || '')) === c.hash;
    return ok;
  }

  function markLoggedIn(remember) {
    lsSet(K.auth, { exp: Date.now() + (remember ? 30 * 864e5 : 12 * 36e5) });
  }

  function isLoggedIn() {
    var s = lsGet(K.auth);
    if (!s || !s.exp) return false;
    if (Date.now() > s.exp) { lsDel(K.auth); return false; }
    return true;
  }

  function logout() { lsDel(K.auth); }

  // 回傳新的 ADMIN 區塊，讓你貼回這個檔案（貼了才會全裝置生效）
  function changeCred(user, pass) {
    var salt = 'sj' + Math.random().toString(36).slice(2, 10);
    var c = { user: String(user || '').trim(), salt: salt, hash: sha256(salt + ':' + String(pass || '')) };
    lsSet(K.cred, c);
    return c;
  }

  function credSnippet(c) {
    return "var ADMIN = {\n" +
           "  user: '" + c.user + "',\n" +
           "  salt: '" + c.salt + "',\n" +
           "  hash: '" + c.hash + "'\n" +
           "};";
  }

  /* ══════════════════════════════════════════════════════ 存檔 / 發佈 */

  function save(d) {
    d = normalize(d);
    d.updatedAt = new Date().toISOString();
    lsSet(K.local, d);
    state.local = d;
    fire();
    return d;
  }

  function isDirty() { return !!state.local; }

  function discardLocal() { lsDel(K.local); state.local = null; fire(); }

  // 已經把 menu.json 放上網站了 → 本機的編輯就不用留著了
  function markPublished() {
    var d = data();
    state.remote = d;
    try { lsSet(K.remote, d); } catch (e) {}
    lsDel(K.local);
    state.local = null;
    fire();
  }

  function resetAll() {
    [K.local, K.remote, K.auth, K.cred, K.gh].forEach(lsDel);
    state.local = null; state.remote = null;
    fire();
  }

  function json() {
    if (state.json == null) state.json = JSON.stringify(data(), null, 2);
    return state.json;
  }

  function bytes() {
    var s = json();
    try { return new Blob([s]).size; }        // 3MB 字串不要跑 utf8Bytes，會生出百萬元素的陣列
    catch (e) { return utf8Bytes(s).length; }
  }

  function sizeText() {
    var b = bytes();
    return b < 1024 ? b + ' B'
         : b < 1048576 ? (b / 1024).toFixed(0) + ' KB'
         : (b / 1048576).toFixed(2) + ' MB';
  }

  function download() {
    var blob = new Blob([json()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'menu.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importJSON(text) {
    var j = JSON.parse(text);                       // 壞掉就讓它 throw，上層接
    if (!j || !Array.isArray(j.items)) throw new Error('這個檔案裡沒有 items，不是菜單檔');
    return save(j);
  }

  /* ---- GitHub 一鍵發佈（選配） ---- */

  function b64(str) {
    var b = (typeof TextEncoder === 'function')
      ? new TextEncoder().encode(str)
      : new Uint8Array(utf8Bytes(str));
    var bin = '', CH = 0x8000;
    for (var i = 0; i < b.length; i += CH)
      bin += String.fromCharCode.apply(null, b.subarray(i, i + CH));
    return btoa(bin);
  }

  function ghConf(c) { if (c) lsSet(K.gh, c); return lsGet(K.gh) || { owner: '', repo: '', branch: 'main', path: 'data/menu.json', token: '' }; }

  function publish(c) {
    c = c || ghConf();
    if (!c.owner || !c.repo || !c.token) return Promise.reject(new Error('請先填 GitHub 帳號、儲存庫名稱和權杖'));

    var api = 'https://api.github.com/repos/' + encodeURIComponent(c.owner) + '/' +
              encodeURIComponent(c.repo) + '/contents/' + c.path.split('/').map(encodeURIComponent).join('/');
    var head = {
      'Authorization': 'Bearer ' + c.token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
    var body = json();

    return fetch(api + '?ref=' + encodeURIComponent(c.branch || 'main'), { headers: head })
      .then(function (r) {
        if (r.status === 404) return null;                       // 檔案還沒有 → 新建
        if (!r.ok) return r.json().then(function (e) { throw new Error(ghErr(r.status, e)); });
        return r.json();
      })
      .then(function (cur) {
        var payload = {
          message: '更新菜單 ' + new Date().toLocaleString('zh-TW'),
          content: b64(body),
          branch: c.branch || 'main'
        };
        if (cur && cur.sha) payload.sha = cur.sha;
        return fetch(api, { method: 'PUT', headers: head, body: JSON.stringify(payload) });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(ghErr(r.status, e)); });
        return r.json();
      })
      .then(function (r) { markPublished(); return r; });
  }

  function ghErr(status, e) {
    var m = (e && e.message) || '';
    if (status === 401) return '權杖無效或過期，請重新產生一組。';
    if (status === 403) return '權杖沒有寫入權限（要勾 Contents: Read and write）。';
    if (status === 404) return '找不到這個儲存庫，帳號 / 名稱 / 分支請再確認一次。';
    if (status === 409) return '分支名稱不對（通常是 main 或 master）。';
    return '發佈失敗（' + status + '）' + (m ? '：' + m : '');
  }

  /* ═════════════════════════════════════════════════════════════ 小工具 */

  var WD = ['日', '一', '二', '三', '四', '五', '六'];

  function newCode(prefix) {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (prefix || 'SJ') + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
           String(Math.floor(1000 + Math.random() * 9000));
  }

  function whenText(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD[d.getDay()] + '）' +
           p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function money(n) { return 'NT$' + (n == null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); }

  /* ═══════════════════════════════════════════════════════════════ API */

  var API = {
    data: data,
    edit: edit,
    settings: function () { return data().settings; },
    items: function () { return data().items; },
    onChange: function (fn) { state.listeners.push(fn); return API; },
    refresh: refresh,

    save: save,
    isDirty: isDirty,
    discardLocal: discardLocal,
    markPublished: markPublished,
    resetAll: resetAll,

    json: json,
    bytes: bytes,
    sizeText: sizeText,
    download: download,
    importJSON: importJSON,

    ghConf: ghConf,
    publish: publish,

    login: function (u, p) { var ok = login(u, p); return ok; },
    markLoggedIn: markLoggedIn,
    isLoggedIn: isLoggedIn,
    logout: logout,
    changeCred: changeCred,
    credSnippet: credSnippet,
    credUser: function () { return cred().user; },

    readImage: readImage,
    placeholder: placeholder,
    imgOf: imgOf,
    esc: esc,
    sha256: sha256,
    newCode: newCode,
    whenText: whenText,
    money: money,
    DEFAULTS: DEFAULTS
  };

  global.ShunjiStore = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
