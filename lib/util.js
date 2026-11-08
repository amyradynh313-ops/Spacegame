'use strict';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
const fa = (n) => Number(n).toLocaleString('fa-IR');

const normDigits = (s) =>
  String(s == null ? '' : s)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٬,،\s]/g, '');

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// برای جستجوی سمت کاربر: یکسان‌سازی ی/ک عربی و فارسی
const normSearch = (s) =>
  String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

module.exports = { esc, fa, normDigits, slugify, normSearch, jsonLd };
