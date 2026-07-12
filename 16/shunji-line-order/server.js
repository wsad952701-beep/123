/* ============================================================
   順記燒臘館 · 線上訂餐（LINE 登入綁定）
   啟動：npm start
   ============================================================ */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, printStartupReport } from './src/config.js';
import authRoutes from './src/routes/auth.js';
import apiRoutes from './src/routes/api.js';
import adminRoutes from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* 部署在 Render / Zeabur / Nginx 後面時，要信任反向代理才知道是 HTTPS */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

/* 基本安全標頭 */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});

/* 上線後強制走 HTTPS（LINE 登入的 Callback 一定要 HTTPS） */
if (config.baseUrl.startsWith('https://')) {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    res.redirect(301, config.baseUrl + req.originalUrl);
  });
}

/* 路由 */
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

app.get('/healthz', (req, res) => res.json({ ok: true, at: new Date().toISOString() }));

/* 靜態網頁 */
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders(res, filePath) {
      /* 圖片可以快取久一點，HTML 不要快取（改了要馬上看到） */
      if (/\.(webp|jpg|png|svg|ico)$/i.test(filePath)) {
        res.set('Cache-Control', 'public, max-age=604800, immutable');
      } else if (/\.html$/i.test(filePath)) {
        res.set('Cache-Control', 'no-cache');
      }
    },
  })
);

app.use((req, res) => res.status(404).redirect('/'));

app.use((err, req, res, next) => {
  console.error('伺服器錯誤：', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, message: '伺服器忙碌中，請稍後再試' });
});

app.listen(config.port, () => printStartupReport());
