'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const key = await scrypt(password, salt, expected.length);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const tokenHash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    if (k) { try { out[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch { /* ignore */ } }
  });
  return out;
}

module.exports = { hashPassword, verifyPassword, newToken, tokenHash, parseCookies };
