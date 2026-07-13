/*!
 * shunji-share.js — 把訂單「一鍵貼到 LINE 社群」
 * 零依賴、單檔、可直接 <script src> 引入。
 *
 * 用法：
 *   ShunjiShare.config({ brand: '順記', communityUrl: 'https://line.me/ti/g2/xxxx' });
 *   ShunjiShare.setOrder(order);            // 訂單資料進來就先把圖畫好（重要！）
 *   btn.onclick = () => ShunjiShare.share(); // 點下去才分享（同步呼叫，不要 await 前置動作）
 *
 * 訂單物件：
 *   {
 *     code:  'SJ0713-2678',
 *     mode:  '外送',                        // 外送 / 自取 / 內用
 *     when:  '7/13（一）12:00',
 *     items: [{ name:'碳燒原隻燒鵝腿飯', qty:2, price:440 }],
 *     total: 440,
 *     note:  '不要香菜',                     // 選填
 *     customer: { name:'', phone:'', address:'' }  // 選填
 *   }
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ 設定 */

  var CFG = {
    brand: '順記',
    brandSub: '碳燒燒鵝 · 線上點餐',
    logo: '',                    // ← 店家 LOGO（dataURL 或網址），會印在收據圖最上方
    communityUrl: '',            // ← 你的 LINE 社群連結，填了才會有「開啟社群」備援
    imageWidth: 1080,
    filename: '訂單.png',
    shareTextWithImage: false,   // iOS 上同時帶 text 有機會被 LINE 擇一，預設關
    footer: '此圖為訂單內容，請商家回覆確認'
  };

  var C = {
    bg: '#0B0907',
    cardTop: '#1B1510',
    cardBot: '#110D0A',
    gold: '#E7CB92',
    goldSoft: '#C9A96B',
    ink: '#F0E8DB',
    muted: '#948A7E',
    hair: 'rgba(231,203,146,0.18)',
    edge: 'rgba(231,203,146,0.34)'
  };

  var SERIF = '"Songti TC","Noto Serif CJK TC","Noto Serif TC","Source Han Serif TC",serif';
  var SANS = '"PingFang TC","Noto Sans CJK TC","Noto Sans TC","Heiti TC",sans-serif';

  /* -------------------------------------------------------------- 內部狀態 */

  var state = {
    order: null,
    text: '',
    canvas: null,
    file: null,
    dataUrl: '',
    building: null
  };

  /* --------------------------------------------------------------- LOGO */
  /* 收據圖上的店家 LOGO。載不到就當作沒有，絕不讓產圖卡住。 */

  var logoImg = null, logoSrc = '';

  function loadLogo() {
    var src = CFG.logo || '';
    if (!src) { logoImg = null; logoSrc = ''; return Promise.resolve(null); }
    if (logoSrc === src && logoImg) return Promise.resolve(logoImg);

    return new Promise(function (res) {
      var im = new Image();
      // 遠端圖沒有 CORS 標頭會汙染畫布 → toBlob 會爆。先要求 CORS，失敗就當沒有。
      if (!/^data:/i.test(src)) im.crossOrigin = 'anonymous';
      im.onload = function () { logoImg = im; logoSrc = src; res(im); };
      im.onerror = function () { logoImg = null; logoSrc = ''; res(null); };
      im.src = src;
    });
  }

  /* ---------------------------------------------------------- canvas 工具 */

  function px(n) { return Math.round(n); }

  // 逐字繪製 + 字距（canvas 的 letterSpacing 支援度不齊，自己來最穩）
  function tracked(ctx, s, x, y, sp, align) {
    var w = trackedWidth(ctx, s, sp);
    var cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    var chars = Array.from(String(s));
    for (var i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cx, y);
      cx += ctx.measureText(chars[i]).width + sp;
    }
    return w;
  }

  function trackedWidth(ctx, s, sp) {
    var chars = Array.from(String(s));
    var w = 0;
    for (var i = 0; i < chars.length; i++) w += ctx.measureText(chars[i]).width + sp;
    return Math.max(0, w - sp);
  }

  // CJK 逐字斷行
  function wrap(ctx, text, maxW) {
    var lines = [], cur = '';
    var chars = Array.from(String(text));
    for (var i = 0; i < chars.length; i++) {
      var t = cur + chars[i];
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = chars[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function hair(ctx, x, y, w, dashed) {
    ctx.save();
    ctx.strokeStyle = C.hair;
    ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x, px(y) + 0.5);
    ctx.lineTo(x + w, px(y) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // 收據外框：上圓角、下鋸齒（撕票口）—— 這張圖在社群訊息流裡一眼就認得出來
  function receiptPath(ctx, x, y, w, h, r, teeth, depth) {
    var tw = w / teeth;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - depth);
    for (var i = 0; i < teeth; i++) {
      var x1 = x + w - i * tw;
      ctx.lineTo(x1 - tw / 2, y + h);
      ctx.lineTo(x1 - tw, y + h - depth);
    }
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ------------------------------------------------------------ 畫收據 */

  // mode: 'measure' 只算高度；'paint' 真的畫。H 只有 paint 時需要。
  function paint(ctx, o, W, mode, H) {
    var draw = mode === 'paint';
    var M = 44;                       // 外緣留白
    var CXX = M, CW = W - M * 2;
    var P = 56;                       // 卡片內距
    var x = CXX + P, w = CW - P * 2;
    var right = x + w;
    var TEETH = 26, DEPTH = 18;

    if (draw) {
      // 底
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // 卡片
      var cardH = H - M * 2;
      receiptPath(ctx, CXX, M, CW, cardH, 28, TEETH, DEPTH);
      var g = ctx.createLinearGradient(0, M, 0, M + cardH);
      g.addColorStop(0, C.cardTop);
      g.addColorStop(1, C.cardBot);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = C.edge;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 頂部金色細光暈
      ctx.save();
      receiptPath(ctx, CXX, M, CW, cardH, 28, TEETH, DEPTH);
      ctx.clip();
      var gl = ctx.createLinearGradient(0, M, 0, M + 220);
      gl.addColorStop(0, 'rgba(231,203,146,0.10)');
      gl.addColorStop(1, 'rgba(231,203,146,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(CXX, M, CW, 220);
      ctx.restore();
    }

    var y = M + 74;
    ctx.textBaseline = 'alphabetic';

    /* LOGO（後台有設定才畫；measure / paint 走同一條分支，高度才會一致） */
    if (logoImg) {
      var LS = 104;                       // 直徑
      var lcy = M + 44 + LS / 2;          // 圓心 y
      if (draw) {
        var iw = logoImg.naturalWidth || logoImg.width || 1;
        var ih = logoImg.naturalHeight || logoImg.height || 1;
        var sc = Math.max(LS / iw, LS / ih);   // cover
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, lcy, LS / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, W / 2 - iw * sc / 2, lcy - ih * sc / 2, iw * sc, ih * sc);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(W / 2, lcy, LS / 2, 0, Math.PI * 2);
        ctx.strokeStyle = C.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      y = M + 44 + LS + 42;               // 品牌那行的基線往下推
    }

    /* 品牌 */
    if (draw) {
      ctx.fillStyle = C.goldSoft;
      ctx.textAlign = 'left';
      ctx.font = '500 26px ' + SANS;
      tracked(ctx, CFG.brand + '　' + CFG.brandSub, W / 2, y, 4, 'center');
    }
    y += 54;

    /* 訂單編號 */
    ctx.font = '700 76px ' + SERIF;
    if (draw) {
      ctx.fillStyle = C.gold;
      tracked(ctx, o.code || '', W / 2, y + 56, 10, 'center');
    }
    y += 96;

    /* 取餐方式 + 時間 */
    ctx.font = '400 30px ' + SANS;
    if (draw) {
      ctx.fillStyle = C.muted;
      var head = [o.mode, o.when].filter(Boolean).join('　');
      tracked(ctx, head, W / 2, y + 22, 3, 'center');
    }
    y += 60;

    y += 34;
    if (draw) hair(ctx, x, y, w, false);
    y += 40;

    /* 品項 */
    var items = o.items || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var qty = it.qty ? ' ×' + it.qty : '';
      var priceStr = it.price != null ? String(it.price) : '';

      ctx.font = '600 40px ' + SANS;
      var pw = priceStr ? ctx.measureText(priceStr).width : 0;
      var nameMax = w - pw - 40;

      ctx.font = '400 36px ' + SANS;
      var lines = wrap(ctx, (it.name || '') + qty, nameMax);

      for (var L = 0; L < lines.length; L++) {
        if (draw) {
          ctx.fillStyle = C.ink;
          ctx.textAlign = 'left';
          ctx.font = '400 36px ' + SANS;
          ctx.fillText(lines[L], x, y + 30);
        }
        if (L === 0 && draw && priceStr) {
          ctx.fillStyle = C.gold;
          ctx.textAlign = 'right';
          ctx.font = '600 40px ' + SANS;
          ctx.fillText(priceStr, right, y + 31);
        }
        y += L === lines.length - 1 ? 50 : 46;
      }
      y += 12;
    }

    y += 22;
    if (draw) hair(ctx, x, y, w, false);
    y += 46;

    /* 合計 */
    if (draw) {
      ctx.fillStyle = C.muted;
      ctx.textAlign = 'left';
      ctx.font = '400 32px ' + SANS;
      tracked(ctx, '合計', x, y + 44, 4, 'left');

      ctx.fillStyle = C.gold;
      ctx.textAlign = 'right';
      ctx.font = '700 62px ' + SANS;
      ctx.fillText('NT$' + (o.total != null ? o.total : ''), right, y + 48);
    }
    y += 84;

    /* 取餐資訊 */
    var cu = o.customer || {};
    var rows = [];
    if (cu.name) rows.push(['取餐人', cu.name]);
    if (cu.phone) rows.push(['電話', cu.phone]);
    if (cu.address) rows.push(['地址', cu.address]);
    if (o.note) rows.push(['備註', o.note]);

    if (rows.length) {
      y += 22;
      if (draw) hair(ctx, x, y, w, true);
      y += 44;

      for (var r = 0; r < rows.length; r++) {
        ctx.font = '400 30px ' + SANS;
        var labW = 118;
        if (draw) {
          ctx.fillStyle = C.muted;
          ctx.textAlign = 'left';
          ctx.fillText(rows[r][0], x, y + 26);
        }
        ctx.font = '400 32px ' + SANS;
        var vlines = wrap(ctx, rows[r][1], w - labW);
        for (var k = 0; k < vlines.length; k++) {
          if (draw) {
            ctx.fillStyle = C.ink;
            ctx.textAlign = 'left';
            ctx.font = '400 32px ' + SANS;
            ctx.fillText(vlines[k], x + labW, y + 26);
          }
          y += 44;
        }
        y += 8;
      }
      y -= 8;
    }

    /* 頁尾 */
    y += 30;
    if (draw) hair(ctx, x, y, w, true);
    y += 40;
    if (draw) {
      ctx.fillStyle = 'rgba(148,138,126,0.75)';
      ctx.textAlign = 'center';
      ctx.font = '400 24px ' + SANS;
      tracked(ctx, CFG.footer, W / 2, y + 20, 2, 'center');
    }
    y += 46;

    return px(y + 44 + DEPTH);   // 下緣留白 + 鋸齒深度
  }

  function renderCanvas(o) {
    var W = CFG.imageWidth;
    var probe = document.createElement('canvas').getContext('2d');
    var H = paint(probe, o, W, 'measure', 0);

    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    paint(c.getContext('2d'), o, W, 'paint', H);
    return c;
  }

  /* ------------------------------------------------------------ 文字版 */

  function buildText(o) {
    var L = [];
    L.push('🧾 ' + CFG.brand + ' 線上點餐');
    L.push('訂單 ' + (o.code || ''));
    L.push([o.mode, o.when].filter(Boolean).join(' ‧ '));
    L.push('────────────');
    (o.items || []).forEach(function (it) {
      L.push('・' + it.name + (it.qty ? ' ×' + it.qty : '') + (it.price != null ? '　' + it.price : ''));
    });
    L.push('────────────');
    L.push('合計 NT$' + (o.total != null ? o.total : ''));

    var cu = o.customer || {};
    if (cu.name) L.push('取餐人：' + cu.name);
    if (cu.phone) L.push('電話：' + cu.phone);
    if (cu.address) L.push('地址：' + cu.address);
    if (o.note) L.push('備註：' + o.note);

    L.push('');
    L.push('（' + CFG.footer + '）');
    return L.join('\n');
  }

  /* ------------------------------------------------- 預先產圖（關鍵！） */
  /* iOS Safari 規定 navigator.share() 必須在使用者手勢的「同一拍」內呼叫。
     如果按下按鈕後才 await 產圖，手勢授權會過期 → NotAllowedError。
     所以訂單一確定就先把 File 做好放著，按鈕按下去是同步呼叫。            */

  function makeFile(blob, mime) {
    if (!blob || typeof File !== 'function') return (state.file = null);
    var name = CFG.filename.replace(/\.(png|jpe?g)$/i, '') + (mime === 'image/jpeg' ? '.jpg' : '.png');
    try { state.file = new File([blob], name, { type: mime }); }
    catch (e) { state.file = null; }
    return state.file;
  }

  function build() {
    var o = state.order;
    if (!o) return Promise.reject(new Error('尚未 setOrder()'));

    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

    state.building = Promise.all([fonts, loadLogo()])
      .then(function () {
        state.canvas = renderCanvas(o);
        try {
          state.dataUrl = state.canvas.toDataURL('image/png');
        } catch (e) {
          // 遠端 LOGO 沒有 CORS 標頭 → 畫布被汙染。拿掉 LOGO 重畫一次，圖照樣要生出來。
          logoImg = null; logoSrc = '';
          state.canvas = renderCanvas(o);
          state.dataUrl = state.canvas.toDataURL('image/png');
        }
        return new Promise(function (res) {
          state.canvas.toBlob(function (blob) {
            // 品項很多時 PNG 會變肥，超過 2MB 就改用 JPEG（有些 Android 分享大檔會失敗）
            if (blob && blob.size > 2 * 1024 * 1024) {
              state.canvas.toBlob(function (jpg) {
                res(makeFile(jpg || blob, jpg ? 'image/jpeg' : 'image/png'));
              }, 'image/jpeg', 0.92);
              return;
            }
            res(makeFile(blob, 'image/png'));
          }, 'image/png');
        });
      });

    return state.building;
  }

  /* ------------------------------------------------------------ 剪貼簿 */

  function copyText(t) {
    // 不 await：避免吃掉 iOS 的手勢授權
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t)['catch'](function () { legacyCopy(t); });
        return true;
      }
    } catch (e) { /* fallthrough */ }
    return legacyCopy(t);
  }

  function legacyCopy(t) {
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, t.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------ 能力偵測 */

  function caps() {
    var f = state.file;
    return {
      shareFile: !!(f && navigator.canShare && navigator.canShare({ files: [f] })),
      shareText: !!navigator.share,
      inLine: /\bLine\//i.test(navigator.userAgent),
      imageReady: !!state.file
    };
  }

  /* ------------------------------------------------------------- 分享 */
  /* 回傳 Promise<'image'|'text'|'line-url'|'copied'|'cancel'>
     ⚠️ 一定要在 click handler 裡「同步」呼叫 share()，前面不要有 await。 */

  function share() {
    var o = state.order;
    if (!o) return Promise.reject(new Error('尚未 setOrder()'));

    var text = state.text || (state.text = buildText(o));
    var f = state.file;

    // 1) 圖片 → 系統分享面板 → LINE → 選社群 → 送出
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      var payload = { files: [f] };
      if (CFG.shareTextWithImage && navigator.canShare({ files: [f], text: text })) payload.text = text;

      var p = navigator.share(payload);   // 同步呼叫，手勢授權還在
      copyText(text);                     // 順手備份到剪貼簿（不 await）
      return p.then(function () { return 'image'; })
              .catch(function (err) {
                if (err && err.name === 'AbortError') return 'cancel';
                return textShare(text);   // 圖片被拒 → 退回文字
              });
    }

    // 2) 沒有檔案分享能力 → 文字分享
    return textShare(text);
  }

  function textShare(text) {
    if (navigator.share) {
      return navigator.share({ text: text })
        .then(function () { return 'text'; })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return 'cancel';
          return lineUrl(text);
        });
    }
    return Promise.resolve(lineUrl(text));
  }

  // 3) 最後手段：LINE 官方分享網址（LINE 內建瀏覽器特別好用）
  function lineUrl(text) {
    copyText(text);
    var url = 'https://line.me/R/share?text=' + encodeURIComponent(text);
    try { location.href = url; } catch (e) { window.open(url, '_blank'); }
    return 'line-url';
  }

  /* --------------------------------------------------------- 其他動作 */

  function saveImage() {
    if (!state.dataUrl) return false;
    var a = document.createElement('a');
    a.href = state.dataUrl;
    a.download = CFG.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  function openCommunity() {
    if (!CFG.communityUrl) return false;
    if (state.order) copyText(state.text || (state.text = buildText(state.order)));
    location.href = CFG.communityUrl;
    return true;
  }

  /* ------------------------------------------------------------- API */

  var API = {
    config: function (o) { for (var k in o) if (o.hasOwnProperty(k)) CFG[k] = o[k]; return API; },
    setOrder: function (o) {
      state.order = o;
      state.text = buildText(o);
      state.file = null;
      state.dataUrl = '';
      build();                       // 立刻開始產圖
      return API;
    },
    ready: function () { return state.building || Promise.resolve(null); },
    share: share,
    copy: function () { return state.order ? copyText(state.text || buildText(state.order)) : false; },
    saveImage: saveImage,
    openCommunity: openCommunity,
    hasCommunity: function () { return !!CFG.communityUrl; },
    text: function () { return state.text; },
    imageUrl: function () { return state.dataUrl; },
    caps: caps
  };

  global.ShunjiShare = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
