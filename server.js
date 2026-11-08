'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const cfg = require('./lib/config');
const { games, users, sessions, seedDemo } = require('./lib/db');
const { hashPassword, verifyPassword, newToken, tokenHash, parseCookies } = require('./lib/auth');
const { normDigits } = require('./lib/util');
const view = require('./lib/render');

const COOKIE = 'sg_session';
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_BODY = 6 * 1024 * 1024;
const MAX_IMAGE = 3 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml']);

/* ------------------------------ seed -------------------------------- */
async function bootstrap() {
  if (!users.adminExists()) {
    let pass = cfg.adminPassword;
    let generated = false;
    if (!pass) { pass = crypto.randomBytes(9).toString('base64url'); generated = true; }
    users.create(cfg.adminUser.toLowerCase(), await hashPassword(pass), 'admin');
    console.log(`[setup] ادمین ساخته شد: ${cfg.adminUser}`);
    if (generated) console.log(`[setup] رمز تصادفی ادمین (فقط همین یک‌بار نمایش داده می‌شود): ${pass}`);
  }
  seedDemo();
  sessions.purge();
  setInterval(() => sessions.purge(), 6 * 3600 * 1000).unref();
}

/* ----------------------------- helpers ------------------------------ */
function clientIp(req) {
  if (cfg.trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return req.socket.remoteAddress || 'unknown';
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '));
  if (cfg.secureCookie) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

function sendBuffer(req, res, status, type, buf, extra = {}) {
  const headers = { 'Content-Type': type, ...extra };
  const ext = Object.keys(MIME).find((k) => MIME[k] === type);
  const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && buf.length > 1024 && (ext ? COMPRESSIBLE.has(ext) : false);
  headers.Vary = 'Accept-Encoding';
  if (gz) { buf = zlib.gzipSync(buf); headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = buf.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : buf);
}
const sendHtml = (req, res, status, html) =>
  sendBuffer(req, res, status, MIME['.html'], Buffer.from(html), { 'Cache-Control': 'no-cache' });
const sendJson = (req, res, status, obj, extra = {}) =>
  sendBuffer(req, res, status, MIME['.json'], Buffer.from(JSON.stringify(obj)), { 'Cache-Control': 'no-store', ...extra });
const sendText = (req, res, status, type, text) =>
  sendBuffer(req, res, status, type, Buffer.from(text), { 'Cache-Control': 'public, max-age=3600' });

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      if (tooBig) return;
      size += c.length;
      if (size > MAX_BODY) { tooBig = true; chunks.length = 0; return; }
      chunks.push(c);
    });
    req.on('end', () => (tooBig ? reject(new HttpError(413, 'حجم درخواست بیش از حد بزرگ است.')) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

function serveFile(req, res, baseDir, rel, cacheControl) {
  if (rel.includes('\0')) return notFound(req, res);
  const full = path.join(baseDir, rel);
  if (!full.startsWith(baseDir + path.sep)) return notFound(req, res);
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return notFound(req, res);
    const ext = path.extname(full).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); return res.end(); }
    const headers = { 'Content-Type': type, 'Cache-Control': cacheControl, ETag: etag, Vary: 'Accept-Encoding' };
    const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && COMPRESSIBLE.has(ext) && st.size > 1024;
    if (gz) headers['Content-Encoding'] = 'gzip'; else headers['Content-Length'] = st.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(full);
    stream.on('error', () => res.destroy());
    if (gz) stream.pipe(zlib.createGzip()).pipe(res); else stream.pipe(res);
  });
}

function notFound(req, res) {
  if ((req.url || '').startsWith('/api/')) return sendJson(req, res, 404, { error: 'پیدا نشد.' });
  sendHtml(req, res, 404, view.notFoundPage());
}

/* ------------------------- rate limiting ---------------------------- */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) if (!arr.some((t) => now - t < 3600 * 1000)) hits.delete(k);
}, 600 * 1000).unref();

/* ----------------------- validation & uploads ----------------------- */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function parsePrice(v, label) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(normDigits(v));
  if (!Number.isInteger(n) || n <= 0 || n > 10_000_000_000) throw new HttpError(400, `${label} باید یک عدد صحیح و بیشتر از صفر باشد.`);
  return n;
}

function parseGame(body, { partial }) {
  const name = String(body.name || '').trim();
  if (!name) throw new HttpError(400, 'نام بازی را وارد کن.');
  if (name.length > 120) throw new HttpError(400, 'نام بازی نباید بیشتر از ۱۲۰ کاراکتر باشد.');
  const platform = String(body.platform || '');
  if (!cfg.platforms.includes(platform)) throw new HttpError(400, 'پلتفرم نامعتبر است.');
  const description = String(body.description || '').trim();
  if (description.length > 4000) throw new HttpError(400, 'توضیحات نباید بیشتر از ۴۰۰۰ کاراکتر باشد.');
  const prices = {
    1: parsePrice(body.price1, 'قیمت ظرفیت ۱'),
    2: parsePrice(body.price2, 'قیمت ظرفیت ۲'),
    3: parsePrice(body.price3, 'قیمت ظرفیت ۳'),
  };
  if (!prices[1] && !prices[2] && !prices[3]) throw new HttpError(400, 'حداقل یکی از قیمت‌های ظرفیت ۱، ۲ یا ۳ را وارد کن.');
  return { name, platform, description, prices, available: body.available !== false && body.available !== 0 && body.available !== 'false' };
}

const FILE_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) throw new HttpError(400, 'فرمت عکس باید JPG، PNG یا WebP باشد.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0 || buf.length > MAX_IMAGE) throw new HttpError(400, 'حجم عکس نباید بیشتر از ۳ مگابایت باشد.');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  const ext = isJpg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : null;
  if (!ext) throw new HttpError(400, 'فایل انتخاب‌شده عکس معتبر نیست.');
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(cfg.uploadsDir, name), buf);
  return name;
}
function deleteImage(name) {
  if (name && FILE_RE.test(name)) fs.rm(path.join(cfg.uploadsDir, name), { force: true }, () => {});
}

/* ----------------------------- sessions ----------------------------- */
function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${cfg.secureCookie ? '; Secure' : ''}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cfg.secureCookie ? '; Secure' : ''}`);
}
function startSession(res, userId) {
  const token = newToken();
  sessions.create(tokenHash(token), userId, Date.now() + SESSION_MS);
  setSessionCookie(res, token);
}
const publicUser = (u) => (u ? { username: u.username, role: u.role } : null);

/* ------------------------------ router ------------------------------ */
const routes = [];
function add(method, pattern, opts, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, opts: opts || {}, handler });
}

const parseId = (s) => {
  const m = /^(\d{1,12})(?:-.*)?$/.exec(s);
  return m ? Number(m[1]) : null;
};

/* ---- pages ---- */
add('GET', '/', {}, (c) => sendHtml(c.req, c.res, 200, view.homePage(games.listPublic())));
add('GET', '/about', {}, (c) => sendHtml(c.req, c.res, 200, view.aboutPage()));
add('GET', '/support', {}, (c) => sendHtml(c.req, c.res, 200, view.supportPage()));
add('GET', '/admin', {}, (c) => sendHtml(c.req, c.res, 200, view.adminPage()));
add('GET', '/game/:slug', {}, (c) => {
  const id = parseId(c.params.slug);
  const g = id ? games.get(id) : null;
  if (!g) return notFound(c.req, c.res);
  const canonical = view.gameUrl(g);
  if (decodeURIComponent(c.url.pathname).replace(/\/$/, '') !== canonical) {
    c.res.writeHead(301, { Location: canonical });
    return c.res.end();
  }
  sendHtml(c.req, c.res, 200, view.gamePage(g));
});
add('GET', '/sitemap.xml', {}, (c) => sendText(c.req, c.res, 200, MIME['.xml'], view.sitemap(games.listPublic())));
add('GET', '/robots.txt', {}, (c) => sendText(c.req, c.res, 200, MIME['.txt'], view.robots()));

/* ---- auth api ---- */
add('GET', '/api/me', {}, (c) => sendJson(c.req, c.res, 200, { user: publicUser(c.user) }));

add('POST', '/api/register', { json: true }, async (c) => {
  if (limited(`reg:${c.ip}`, 8, 3600 * 1000)) throw new HttpError(429, 'تعداد تلاش‌ها زیاد بود. کمی بعد دوباره امتحان کن.');
  const username = String(c.body.username || '').trim();
  const password = String(c.body.password || '');
  if (!USERNAME_RE.test(username)) throw new HttpError(400, 'نام کاربری باید ۳ تا ۲۰ حرف انگلیسی، عدد یا _ باشد.');
  if (password.length < 6 || password.length > 64) throw new HttpError(400, 'رمز عبور باید بین ۶ تا ۶۴ کاراکتر باشد.');
  if (users.byName(username)) throw new HttpError(409, 'این نام کاربری قبلا استفاده شده است.');
  let id;
  try { id = users.create(username.toLowerCase(), await hashPassword(password), 'user'); }
  catch (e) { throw new HttpError(409, 'این نام کاربری قبلا استفاده شده است.'); }
  startSession(c.res, id);
  sendJson(c.req, c.res, 201, { user: { username: username.toLowerCase(), role: 'user' } });
});

let dummyHash = null;
add('POST', '/api/login', { json: true }, async (c) => {
  if (limited(`login:${c.ip}`, 10, 10 * 60 * 1000)) throw new HttpError(429, 'تلاش‌های ناموفق زیاد بود. ۱۰ دقیقه بعد دوباره امتحان کن.');
  const username = String(c.body.username || '').trim();
  const password = String(c.body.password || '');
  if (!username || !password) throw new HttpError(400, 'نام کاربری و رمز عبور را وارد کن.');
  const u = users.byName(username);
  if (!dummyHash) dummyHash = await hashPassword('dummy-password');
  const ok = await verifyPassword(password, u ? u.password_hash : dummyHash);
  if (!u || !ok) throw new HttpError(401, 'نام کاربری یا رمز عبور اشتباه است.');
  startSession(c.res, Number(u.id));
  sendJson(c.req, c.res, 200, { user: publicUser(u) });
});

add('POST', '/api/logout', { json: true }, (c) => {
  if (c.token) sessions.remove(tokenHash(c.token));
  clearSessionCookie(c.res);
  sendJson(c.req, c.res, 200, { ok: true });
});

add('POST', '/api/account/password', { json: true, auth: 'user' }, async (c) => {
  const cur = String(c.body.current || '');
  const next = String(c.body.next || '');
  if (next.length < 6 || next.length > 64) throw new HttpError(400, 'رمز جدید باید بین ۶ تا ۶۴ کاراکتر باشد.');
  const row = users.byId(c.user.id);
  if (!(await verifyPassword(cur, row.password_hash))) throw new HttpError(400, 'رمز فعلی اشتباه است.');
  users.setPassword(c.user.id, await hashPassword(next));
  sessions.removeOthers(c.user.id, tokenHash(c.token));
  sendJson(c.req, c.res, 200, { ok: true });
});

/* ---- admin api ---- */
add('GET', '/api/admin/games', { auth: 'admin' }, (c) => sendJson(c.req, c.res, 200, { games: games.listAdmin() }));

add('POST', '/api/admin/games', { json: true, auth: 'admin' }, (c) => {
  const g = parseGame(c.body, { partial: false });
  g.image = c.body.image ? saveImage(c.body.image) : null;
  let id;
  try { id = games.create(g); } catch (e) { deleteImage(g.image); throw e; }
  sendJson(c.req, c.res, 201, { game: games.get(id) });
});

add('PUT', '/api/admin/games/:id', { json: true, auth: 'admin' }, (c) => {
  const id = Number(c.params.id);
  const old = Number.isInteger(id) ? games.get(id) : null;
  if (!old) throw new HttpError(404, 'بازی پیدا نشد.');
  const g = parseGame(c.body, { partial: true });
  let newImage = null;
  if (c.body.image === undefined) g.image = old.image;
  else if (c.body.image === null || c.body.image === '') g.image = null;
  else { newImage = saveImage(c.body.image); g.image = newImage; }
  try { games.update(id, g); } catch (e) { deleteImage(newImage); throw e; }
  if (old.image && old.image !== g.image) deleteImage(old.image);
  sendJson(c.req, c.res, 200, { game: games.get(id) });
});

add('DELETE', '/api/admin/games/:id', { auth: 'admin' }, (c) => {
  const id = Number(c.params.id);
  const old = Number.isInteger(id) ? games.get(id) : null;
  if (!old) throw new HttpError(404, 'بازی پیدا نشد.');
  games.remove(id);
  deleteImage(old.image);
  sendJson(c.req, c.res, 200, { ok: true });
});

add('GET', '/api/admin/users', { auth: 'admin' }, (c) =>
  sendJson(c.req, c.res, 200, { users: users.list().map((u) => ({ id: Number(u.id), username: u.username, role: u.role, createdAt: u.created_at })) }));

/* ------------------------------ handler ----------------------------- */
async function handle(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST, PUT, DELETE' });
    return res.end();
  }
  let url;
  let pathname;
  try {
    url = new URL(req.url, 'http://local');
    pathname = decodeURIComponent(url.pathname);
  } catch { res.writeHead(400); return res.end(); }

  const isRead = req.method === 'GET' || req.method === 'HEAD';

  if (isRead) {
    if (pathname.startsWith('/uploads/')) return serveFile(req, res, cfg.uploadsDir, pathname.slice(9), 'public, max-age=2592000, immutable');
    if (/^\/(css|js|img|fonts)\//.test(pathname)) {
      const long = url.searchParams.has('v');
      return serveFile(req, res, cfg.publicDir, pathname.slice(1), long ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    }
  }

  const method = req.method === 'HEAD' ? 'GET' : req.method;
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let match = null;
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.re.exec(trimmed);
    if (m) { match = { r, m }; break; }
  }
  if (!match) return notFound(req, res);

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE] || '';
  const user = token ? sessions.find(tokenHash(token)) : null;
  const params = {};
  match.r.keys.forEach((k, i) => { params[k] = match.m[i + 1]; });
  const ctx = { req, res, url, params, user, token, ip: clientIp(req), body: {} };

  try {
    if (method !== 'GET') {
      const origin = req.headers.origin;
      if (origin) {
        let ok = false;
        try { ok = new URL(origin).host === req.headers.host; } catch { ok = false; }
        if (!ok) throw new HttpError(403, 'درخواست نامعتبر است.');
      }
    }
    if (match.r.opts.auth) {
      if (!user) throw new HttpError(401, 'ابتدا وارد حساب خودت شو.');
      if (match.r.opts.auth === 'admin' && user.role !== 'admin') throw new HttpError(403, 'دسترسی نداری.');
    }
    if (match.r.opts.json) {
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'نوع درخواست نامعتبر است.');
      const raw = await readBody(req);
      try { ctx.body = raw.length ? JSON.parse(raw.toString('utf8')) : {}; }
      catch { throw new HttpError(400, 'اطلاعات ارسالی معتبر نیست.'); }
      if (!ctx.body || typeof ctx.body !== 'object' || Array.isArray(ctx.body)) throw new HttpError(400, 'اطلاعات ارسالی معتبر نیست.');
    } else if (method !== 'GET') {
      req.resume();
    }
    await match.r.handler(ctx);
  } catch (err) {
    if (res.headersSent) return res.destroy();
    const status = err.status || 500;
    if (status === 500) console.error('[error]', err);
    const message = status === 500 ? 'خطای سرور. دوباره تلاش کن.' : err.message;
    if (pathname.startsWith('/api/')) sendJson(req, res, status, { error: message });
    else sendHtml(req, res, status, view.notFoundPage());
  }
}

bootstrap().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('[fatal]', e);
      if (!res.headersSent) { res.writeHead(500); }
      res.end();
    });
  });
  server.keepAliveTimeout = 65000;
  server.listen(cfg.port, cfg.host, () => console.log(`Space Game اجرا شد: ${cfg.siteUrl} (پورت ${cfg.port})`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}).catch((e) => { console.error(e); process.exit(1); });
