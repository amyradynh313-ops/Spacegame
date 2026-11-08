'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

(function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
})();

const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

module.exports = {
  root,
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  siteUrl,
  secureCookie: siteUrl.startsWith('https://'),
  telegram: (process.env.TELEGRAM_USERNAME || 'Amir56743').replace(/^@/, ''),
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  trustProxy: process.env.TRUST_PROXY === '1',
  dbFile: process.env.DB_FILE || path.join(root, 'data', 'space-game.db'),
  uploadsDir: path.join(root, 'uploads'),
  publicDir: path.join(root, 'public'),
  storeName: 'Space Game',
  storeNameFa: 'اسپیس گیم',
  platforms: ['PS5', 'PS4', 'PS4 و PS5'],
};
