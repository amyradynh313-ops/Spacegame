'use strict';
const cfg = require('./config');
const { esc, fa, slugify, normSearch, jsonLd } = require('./util');

const V = Date.now().toString(36); // برای به‌روزرسانی کش فایل‌های استاتیک
const FONTS =
  'https://fonts.googleapis.com/css2?family=Lalezar&family=Orbitron:wght@700;900&family=Vazirmatn:wght@400;500;700&display=swap';

const sticker = (name) => `/img/stickers/${name}.svg?v=${V}`;
const stImg = (name, size, cls = '') =>
  `<img class="${cls}" src="${sticker(name)}" width="${size}" height="${size}" alt="" aria-hidden="true">`;

const COVERS = ['rocket', 'planet', 'gamepad', 'ufo', 'helmet', 'star'];

const gameUrl = (g) => {
  const s = slugify(g.name);
  return `/game/${g.id}${s ? '-' + s : ''}`;
};
const prices = (g) => Object.entries(g.prices).filter(([, v]) => v).map(([cap, p]) => ({ cap: Number(cap), price: p }));
const minPrice = (g) => Math.min(...prices(g).map((x) => x.price));
const maxPrice = (g) => Math.max(...prices(g).map((x) => x.price));
const absImg = (g) => (g.image ? `${cfg.siteUrl}/uploads/${g.image}` : `${cfg.siteUrl}/img/og.png`);

function cover(g, lazy = true) {
  if (g.image) {
    return `<img src="/uploads/${esc(g.image)}" width="600" height="750" alt="${esc(g.name)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
  }
  const i = g.id % COVERS.length;
  return `<div class="ph ph-${g.id % 5}" role="img" aria-label="${esc(g.name)}">${stImg(COVERS[i], 110)}<span>${esc(g.name)}</span></div>`;
}

/* ------------------------------------------------------------------ */
/*                              layout                                */
/* ------------------------------------------------------------------ */
function layout(o) {
  const url = cfg.siteUrl + (o.path || '/');
  const image = o.image || `${cfg.siteUrl}/img/og.png`;
  const robots = o.noindex
    ? '<meta name="robots" content="noindex,nofollow">'
    : '<meta name="robots" content="index,follow,max-image-preview:large">';
  const ld = (o.jsonld || []).map((x) => `<script type="application/ld+json">${jsonLd(x)}</script>`).join('\n');
  const nav = (href, label) =>
    `<a href="${href}"${o.active === href ? ' aria-current="page"' : ''}>${label}</a>`;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
${robots}
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0A0618">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="${cfg.storeName} | ${cfg.storeNameFa}">
<meta property="og:locale" content="fa_IR">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/css/style.css?v=${V}">
${ld}
</head>
<body data-telegram="${esc(cfg.telegram)}">
<a class="skip" href="#main">رفتن به محتوای اصلی</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="${cfg.storeName} | ${cfg.storeNameFa} - صفحه اصلی">
      ${stImg('planet', 40, 'brand-icon')}
      <span class="brand-en">SPACE GAME</span>
    </a>
    <nav class="main-nav" aria-label="منوی اصلی">
      ${nav('/', 'خانه')}
      ${nav('/about', 'درباره ما')}
      ${nav('/support', 'پشتیبانی')}
    </nav>
    <div class="auth" id="navAuth">
      <button class="btn btn-ghost btn-sm" type="button" data-auth="login">ورود</button>
      <button class="btn btn-primary btn-sm" type="button" data-auth="register">ثبت‌نام</button>
    </div>
  </div>
</header>

<main id="main">
${o.body}
</main>

<footer class="site-footer">
  <div class="wrap foot">
    <div class="foot-brand">
      <span class="brand-en">SPACE GAME</span>
      <p>تهیه اکانت‌های پلی‌استیشن ۵ با بهترین قیمت، تحویل فوری و گارانتی ۱ ساله.</p>
    </div>
    <nav class="foot-links" aria-label="لینک‌های سایت">
      <a href="/">خانه</a>
      <a href="/about">درباره ما</a>
      <a href="/support">پشتیبانی</a>
      <a href="https://t.me/${esc(cfg.telegram)}" target="_blank" rel="noopener noreferrer">تلگرام: <span dir="ltr">@${esc(cfg.telegram)}</span></a>
    </nav>
  </div>
  <div class="wrap copy">© ${new Date().toLocaleDateString('fa-IR', { year: 'numeric' })} ${cfg.storeName}. همه حقوق محفوظ است.</div>
</footer>

${o.noFab ? '' : `<a class="fab" href="https://t.me/${esc(cfg.telegram)}" target="_blank" rel="noopener noreferrer" aria-label="پشتیبانی در تلگرام">
  ${stImg('telegram', 56)}
  <span>پشتیبانی</span>
</a>`}

<div id="modalRoot"></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script src="/js/app.js?v=${V}" defer></script>
${o.script ? `<script src="${o.script}?v=${V}" defer></script>` : ''}
</body>
</html>`;
}

const orgLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: `${cfg.storeName} | ${cfg.storeNameFa}`,
  alternateName: [cfg.storeName, cfg.storeNameFa],
  url: cfg.siteUrl,
  logo: `${cfg.siteUrl}/img/stickers/planet.svg`,
  sameAs: [`https://t.me/${cfg.telegram}`],
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', url: `https://t.me/${cfg.telegram}`, availableLanguage: 'fa' }],
});

const siteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: `${cfg.storeName} | ${cfg.storeNameFa}`,
  url: cfg.siteUrl,
  inLanguage: 'fa-IR',
});

/* ------------------------------------------------------------------ */
/*                               pages                                */
/* ------------------------------------------------------------------ */
function card(g) {
  const caps = prices(g);
  const search = normSearch(`${g.name} ${g.platform}`);
  return `<li class="card-item" data-platform="${esc(g.platform)}" data-search="${esc(search)}" data-price="${minPrice(g)}" data-id="${g.id}">
  <a class="card${g.available ? '' : ' is-off'}" href="${gameUrl(g)}">
    <div class="cover">${cover(g)}<span class="badge">${esc(g.platform)}</span>${g.available ? '' : '<span class="soldout">ناموجود</span>'}</div>
    <div class="card-body">
      <h3>${esc(g.name)}</h3>
      <div class="caps">${caps.map((c) => `<span class="cap">ظرفیت ${fa(c.cap)}</span>`).join('')}</div>
      <div class="price"><small>از</small> ${fa(minPrice(g))} <small>تومان</small></div>
    </div>
  </a>
</li>`;
}

function homePage(games) {
  const platforms = ['all', ...cfg.platforms];
  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1>خرید اکانت پلی‌استیشن ۵ با بهترین قیمت و گارانتی ۱ ساله</h1>
      <p>تحویل فوری، پشتیبانی واقعی در تلگرام و امکان فروش مجدد اکانت به خودمان. اسپیس گیم، مقصد گیمرهایی که سریع می‌خرند.</p>
      <div class="cta">
        <a class="btn btn-primary btn-lg" href="#games">مشاهده اکانت‌ها</a>
        <a class="btn btn-ghost btn-lg" href="/about">چرا اسپیس گیم؟</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <img class="s s-rocket" src="${sticker('rocket')}" width="250" height="250" alt="">
      <img class="s s-planet" src="${sticker('planet')}" width="190" height="190" alt="">
      <img class="s s-pad" src="${sticker('gamepad')}" width="200" height="200" alt="">
      <img class="s s-star" src="${sticker('star')}" width="120" height="120" alt="">
      <img class="s s-ufo" src="${sticker('ufo')}" width="130" height="130" alt="">
    </div>
  </div>
</section>

<section class="wrap perks" aria-label="مزیت‌ها">
  <div class="perk">${stImg('bolt', 64)}<div><b>تحویل فوری</b><span>بعد از نهایی شدن سفارش</span></div></div>
  <div class="perk">${stImg('shield', 64)}<div><b>گارانتی ۱ ساله</b><span>برای همه‌ی اکانت‌ها</span></div></div>
  <div class="perk">${stImg('coin', 64)}<div><b>بهترین قیمت</b><span>ظرفیت ۱، ۲ و ۳</span></div></div>
</section>

<section class="wrap" id="games" aria-labelledby="gamesTitle">
  <div class="section-head">
    <h2 id="gamesTitle">اکانت‌ها و بازی‌های پلی‌استیشن</h2>
    <span class="count" id="count" aria-live="polite">${games.length ? fa(games.length) + ' مورد' : ''}</span>
  </div>
  <div class="toolbar">
    <div class="search">
      <label class="sr" for="q">جستجوی بازی</label>
      <input type="search" id="q" placeholder="نام بازی را جستجو کن" autocomplete="off">
    </div>
    <label class="sr" for="sort">مرتب‌سازی</label>
    <select id="sort">
      <option value="new">جدیدترین</option>
      <option value="cheap">ارزان‌ترین</option>
      <option value="exp">گران‌ترین</option>
    </select>
  </div>
  <div class="chips" id="chips" role="group" aria-label="فیلتر پلتفرم">
    ${platforms.map((p, i) => `<button type="button" class="chip" data-p="${esc(p)}" aria-pressed="${i === 0}">${p === 'all' ? 'همه' : esc(p)}</button>`).join('')}
  </div>
  <ul class="grid" id="grid">${games.map(card).join('')}</ul>
  <div class="empty" id="empty"${games.length ? ' hidden' : ''}>
    ${stImg('helmet', 96)}
    <b>${games.length ? 'موردی پیدا نشد' : 'هنوز موردی اضافه نشده'}</b>
    <span>${games.length ? 'عبارت جستجو یا فیلتر پلتفرم را تغییر بده.' : 'به‌زودی آیتم‌های جدید اینجا قرار می‌گیرند.'}</span>
  </div>
</section>

<section class="wrap">
  <div class="band">
    ${stImg('headset', 120, 'band-art')}
    <div>
      <h2>سوالی داری؟ پیام بده</h2>
      <p>برای راهنمایی در انتخاب ظرفیت و سفارش، مستقیم در تلگرام با پشتیبانی در ارتباط باش.</p>
    </div>
    <a class="btn btn-primary btn-lg" href="https://t.me/${esc(cfg.telegram)}" target="_blank" rel="noopener noreferrer">پیام در تلگرام</a>
  </div>
</section>`;

  const list = games.slice(0, 20);
  return layout({
    title: `${cfg.storeName} | ${cfg.storeNameFa} - خرید اکانت پلی‌استیشن ۵ با بهترین قیمت و گارانتی ۱ ساله`,
    desc: 'خرید اکانت پلی استیشن ۵ و بازی PS5 و PS4 با بهترین قیمت، تحویل فوری و گارانتی ۱ ساله. ظرفیت ۱، ۲ و ۳. پشتیبانی در تلگرام.',
    path: '/',
    active: '/',
    body,
    jsonld: [
      orgLd(),
      siteLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: list.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: cfg.siteUrl + gameUrl(g),
          name: g.name,
        })),
      },
    ],
  });
}

function gamePage(g) {
  const caps = prices(g);
  const first = caps[0];
  const body = `
<div class="wrap crumbs-wrap">
  <nav class="crumbs" aria-label="مسیر صفحه">
    <a href="/">خانه</a><span aria-hidden="true">/</span><a href="/#games">اکانت‌ها</a><span aria-hidden="true">/</span><span aria-current="page">${esc(g.name)}</span>
  </nav>
</div>
<article class="wrap detail" id="detail"
  data-name="${esc(g.name)}" data-platform="${esc(g.platform)}" data-available="${g.available ? 1 : 0}">
  <div class="detail-cover cover">
    ${cover(g, false)}
    <span class="badge">${esc(g.platform)}</span>
    ${g.available ? '' : '<span class="soldout">ناموجود</span>'}
  </div>
  <div class="detail-info">
    <h1>${esc(g.name)}</h1>
    <fieldset class="caps-pick"${g.available ? '' : ' disabled'}>
      <legend>ظرفیت را انتخاب کن</legend>
      <div class="caps-grid">
        ${caps.map((c, i) => `<label class="cap-opt">
          <input type="radio" name="cap" value="${c.cap}" data-price="${c.price}"${i === 0 ? ' checked' : ''}>
          <span class="cap-box"><b>ظرفیت ${fa(c.cap)}</b><em>${fa(c.price)} تومان</em></span>
        </label>`).join('')}
      </div>
    </fieldset>
    <div class="price-big" aria-live="polite"><span id="priceNow">${fa(first.price)}</span> <small>تومان</small></div>
    <button class="btn btn-primary btn-lg btn-block" id="buyBtn" type="button"${g.available ? '' : ' disabled'}>${g.available ? 'خرید از طریق تلگرام' : 'فعلا ناموجود است'}</button>
    <p class="hint" id="buyHint">با زدن دکمه خرید، به تلگرام می‌روی و سفارش را با پشتیبان نهایی می‌کنی.</p>
    <ul class="mini-perks">
      <li>${stImg('shield', 44)}<span>گارانتی ۱ ساله</span></li>
      <li>${stImg('bolt', 44)}<span>تحویل فوری</span></li>
      <li>${stImg('headset', 44)}<span>پشتیبانی در تلگرام</span></li>
    </ul>
    <section class="desc" aria-labelledby="descTitle">
      <h2 id="descTitle">توضیحات</h2>
      <p>${g.description ? esc(g.description).replace(/\n/g, '<br>') : 'برای اطلاعات بیشتر درباره این مورد در تلگرام پیام بده.'}</p>
    </section>
  </div>
</article>`;

  const desc = (g.description ? g.description.replace(/\s+/g, ' ').slice(0, 110) + ' - ' : '') +
    `خرید ${g.name} برای ${g.platform} از ${fa(minPrice(g))} تومان با گارانتی ۱ ساله و تحویل فوری.`;
  const url = cfg.siteUrl + gameUrl(g);
  return layout({
    title: `خرید ${g.name} ${g.platform} | ${cfg.storeName} اسپیس گیم`,
    desc,
    path: gameUrl(g),
    image: absImg(g),
    ogType: 'product',
    body,
    script: '/js/game.js',
    jsonld: [
      orgLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: g.name,
        description: g.description || `${g.name} برای ${g.platform}`,
        image: [absImg(g)],
        category: g.platform,
        brand: { '@type': 'Brand', name: cfg.storeName },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'IRR',
          lowPrice: String(minPrice(g) * 10),
          highPrice: String(maxPrice(g) * 10),
          offerCount: caps.length,
          availability: g.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url,
          offers: caps.map((c) => ({
            '@type': 'Offer',
            name: `ظرفیت ${c.cap}`,
            priceCurrency: 'IRR',
            price: String(c.price * 10),
            availability: g.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url,
          })),
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'خانه', item: cfg.siteUrl + '/' },
          { '@type': 'ListItem', position: 2, name: g.name, item: url },
        ],
      },
    ],
  });
}

function aboutPage() {
  const reasons = [
    ['swap', 'اکانت را به خودمان بفروشید', 'اگر حتی یک خرید داشته باشید، می‌توانید اکانت را به خودمان بفروشید.'],
    ['headset', 'پشتیبانی فوق‌العاده', 'با اولین خرید، مشمول پشتیبانی فوق‌العاده ما می‌شوید.'],
    ['shield', 'گارانتی ۱ ساله', 'اکانت‌ها با گارانتی ۱ ساله تحویل داده می‌شوند.'],
    ['bolt', 'تحویل فوری', 'سفارش که نهایی شد، اکانت را سریع تحویل می‌گیرید.'],
    ['coin', 'بهترین قیمت', 'برای هر ظرفیت قیمت مناسب داریم تا هزینه‌ی بازی‌هایتان کمتر شود.'],
  ];
  const body = `
<section class="page-hero">
  <div class="wrap page-hero-grid">
    <div>
      <h1>درباره Space Game</h1>
      <p class="lead">تهیه اکانت‌های پلی‌استیشن ۵ با بهترین قیمت و تحویل فوری و گارانتی ۱ ساله</p>
    </div>
    ${stImg('helmet', 190, 'page-art')}
  </div>
</section>
<section class="wrap" aria-labelledby="whyTitle">
  <h2 class="sec-title" id="whyTitle">چرا باید از ما خرید کنید؟</h2>
  <div class="reasons">
    ${reasons.map(([s, t, d]) => `<div class="reason">${stImg(s, 96)}<h3>${t}</h3><p>${d}</p></div>`).join('')}
    <div class="reason reason-more">${stImg('star', 96)}<h3>و دلایل دیگر</h3><p>بقیه‌اش را بعد از اولین خرید خودتان متوجه می‌شوید.</p></div>
  </div>
  <div class="band">
    ${stImg('rocket', 120, 'band-art')}
    <div><h2>آماده‌ای شروع کنیم؟</h2><p>اکانت مورد نظرت را انتخاب کن و خرید را در تلگرام نهایی کن.</p></div>
    <a class="btn btn-primary btn-lg" href="/#games">مشاهده اکانت‌ها</a>
  </div>
</section>`;
  return layout({
    title: `درباره ما | ${cfg.storeName} اسپیس گیم - اکانت پلی‌استیشن ۵ با گارانتی ۱ ساله`,
    desc: 'اسپیس گیم: تهیه اکانت‌های پلی‌استیشن ۵ با بهترین قیمت، تحویل فوری و گارانتی ۱ ساله. با یک خرید، مشمول پشتیبانی فوق‌العاده ما می‌شوید و می‌توانید اکانت را به ما بفروشید.',
    path: '/about',
    active: '/about',
    body,
    jsonld: [
      orgLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'درباره ما',
        url: cfg.siteUrl + '/about',
        inLanguage: 'fa-IR',
      },
    ],
  });
}

function supportPage() {
  const steps = [
    'وارد حسابت شو یا ثبت‌نام کن.',
    'اکانت یا بازی مورد نظر و ظرفیت دلخواهت را انتخاب کن.',
    'دکمه «خرید از طریق تلگرام» را بزن.',
    'سفارش را با پشتیبان در تلگرام نهایی کن و اکانتت را تحویل بگیر.',
  ];
  const body = `
<section class="page-hero">
  <div class="wrap page-hero-grid">
    <div>
      <h1>پشتیبانی Space Game</h1>
      <p class="lead">برای سفارش، انتخاب ظرفیت یا هر سوالی، مستقیم در تلگرام پیام بده.</p>
      <a class="btn btn-primary btn-lg" href="https://t.me/${esc(cfg.telegram)}" target="_blank" rel="noopener noreferrer">پیام در تلگرام: <span dir="ltr">@${esc(cfg.telegram)}</span></a>
    </div>
    ${stImg('headset', 190, 'page-art')}
  </div>
</section>
<section class="wrap" aria-labelledby="howTitle">
  <h2 class="sec-title" id="howTitle">خرید چطور انجام می‌شود؟</h2>
  <ol class="steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>
</section>`;
  return layout({
    title: `پشتیبانی | ${cfg.storeName} اسپیس گیم`,
    desc: 'پشتیبانی اسپیس گیم در تلگرام. راهنمای خرید اکانت پلی‌استیشن ۵ و انتخاب ظرفیت.',
    path: '/support',
    active: '/support',
    body,
    jsonld: [orgLd()],
  });
}

function adminPage() {
  return layout({
    title: `پنل مدیریت | ${cfg.storeName}`,
    desc: 'پنل مدیریت',
    path: '/admin',
    noindex: true,
    noFab: true,
    script: '/js/admin.js',
    body: '<div class="wrap" id="adminApp"><p class="muted loading">در حال بارگذاری…</p></div>',
  });
}

function notFoundPage() {
  return layout({
    title: `صفحه پیدا نشد | ${cfg.storeName}`,
    desc: 'صفحه‌ای که دنبالش بودی پیدا نشد.',
    path: '/404',
    noindex: true,
    body: `<section class="wrap nf">${stImg('ufo', 160)}<h1>این صفحه گم شده</h1><p>آدرس را اشتباه وارد کرده‌ای یا صفحه حذف شده است.</p><a class="btn btn-primary btn-lg" href="/">بازگشت به خانه</a></section>`,
  });
}

function sitemap(games) {
  const u = (loc, lastmod, pr) =>
    `<url><loc>${esc(cfg.siteUrl + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${pr}</priority></url>`;
  const day = (s) => (s ? String(s).slice(0, 10) : '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${u('/', '', '1.0')}
${u('/about', '', '0.6')}
${u('/support', '', '0.6')}
${games.map((g) => u(gameUrl(g), day(g.updatedAt), '0.8')).join('\n')}
</urlset>
`;
}

const robots = () => `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${cfg.siteUrl}/sitemap.xml
`;

module.exports = { homePage, gamePage, aboutPage, supportPage, adminPage, notFoundPage, sitemap, robots, gameUrl };
