/* 授權失敗時給客人看的頁面（不是給工程師看的堆疊訊息） */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function errorPage({ title, message, hint = '', retry = true }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}｜順記燒臘館</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23A8181C'/%3E%3Ctext x='32' y='45' font-size='40' font-family='serif' font-weight='700' fill='%23F2D391' text-anchor='middle'%3E順%3C/text%3E%3C/svg%3E">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:22px;
    background:#14100D;
    background-image:radial-gradient(58% 46% at 78% 24%,rgba(196,97,31,.16),transparent 68%),
                     radial-gradient(46% 40% at 12% 78%,rgba(168,24,28,.13),transparent 70%);
    color:#F5F0E6;font-family:"Noto Sans TC","PingFang TC",system-ui,sans-serif;line-height:1.9}
  .card{width:100%;max-width:380px;background:#1C1713;border:1px solid rgba(214,164,78,.20);
    border-radius:22px;padding:36px 26px 28px;text-align:center;
    box-shadow:0 40px 100px -20px rgba(0,0,0,.9)}
  .seal{width:52px;height:52px;border-radius:14px;background:#A8181C;color:#F2D391;
    display:grid;place-items:center;margin:0 auto 22px;
    font-family:"Noto Serif TC",serif;font-size:26px;font-weight:700}
  h1{margin:0 0 12px;font-family:"Noto Serif TC",serif;font-size:1.3rem;letter-spacing:.08em}
  p{margin:0 0 8px;font-size:14.5px;color:rgba(245,240,230,.62)}
  .hint{margin-top:16px;padding:13px 15px;border-radius:10px;text-align:left;
    background:rgba(214,164,78,.06);border:1px solid rgba(214,164,78,.18);
    font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.85;
    color:rgba(242,211,145,.85);word-break:break-all;white-space:pre-wrap}
  .btns{display:grid;gap:10px;margin-top:24px}
  a.b{display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;
    border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:.05em}
  .green{background:#06C755;color:#fff;box-shadow:0 8px 24px -6px rgba(6,199,85,.6)}
  .ghost{border:1px solid rgba(214,164,78,.38);color:#F2D391}
  svg{width:22px;height:22px;fill:currentColor}
</style>
</head>
<body>
  <div class="card">
    <div class="seal">順</div>
    <h1>${esc(title)}</h1>
    <p>${message}</p>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
    <div class="btns">
      ${
        retry
          ? `<a class="b green" href="/auth/line">
               <svg viewBox="0 0 24 24"><path d="M24 10.3C24 4.9 18.6.6 12 .6S0 4.9 0 10.3c0 4.8 4.3 8.8 10 9.6.4.1.9.3 1.1.6.1.3.1.8 0 1.1l-.2 1c0 .3-.2 1.2 1 .6 1.3-.5 6.9-4 9.4-7 1.8-1.9 2.7-3.9 2.7-6z"/></svg>
               再試一次
             </a>`
          : ''
      }
      <a class="b ghost" href="/">回首頁</a>
    </div>
  </div>
</body>
</html>`;
}
