'use strict';
// تولید استیکرهای SVG سفارشی (لبه‌ی سفید + سایه) و پس‌زمینه‌ی ستاره‌ای
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(path.join(out, 'stickers'), { recursive: true });

const FILTER = `<defs><filter id="st" x="-20%" y="-20%" width="140%" height="145%" color-interpolation-filters="sRGB">
<feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/>
<feFlood flood-color="#ffffff" result="f"/>
<feComposite in="f" in2="d" operator="in" result="w"/>
<feDropShadow in="w" dx="0" dy="5" stdDeviation="4.5" flood-color="#1b0442" flood-opacity=".55" result="ws"/>
<feMerge><feMergeNode in="ws"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${FILTER}<g filter="url(#st)">${inner}</g></svg>\n`;

const star = (cx, cy, R, r, rot = -90) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

const S = {};

S.rocket = wrap(`<g transform="translate(100 100) rotate(38) scale(.88) translate(-100 -102)">
<path d="M88 146 Q100 196 112 146 Z" fill="#F97316"/><path d="M94 146 Q100 178 106 146 Z" fill="#FDE68A"/>
<path d="M75 105 L46 142 L46 166 L79 142 Z" fill="#7C3AED"/><path d="M125 105 L154 142 L154 166 L121 142 Z" fill="#7C3AED"/>
<path d="M100 14 C132 46 138 96 127 138 L73 138 C62 96 68 46 100 14 Z" fill="#EDE9FE"/>
<path d="M100 14 C114 28 122 44 127 62 L73 62 C78 44 86 28 100 14 Z" fill="#A855F7"/>
<circle cx="100" cy="88" r="17" fill="#C4B5FD"/><circle cx="100" cy="88" r="12" fill="#2E1065"/>
<path d="M93 84 q3 -5 8 -4" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
<rect x="86" y="136" width="28" height="10" rx="4" fill="#4C1D95"/></g>`);

S.planet = wrap(`<defs><clipPath id="pc"><circle cx="100" cy="100" r="46"/></clipPath>
<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D8B4FE"/><stop offset="1" stop-color="#6D28D9"/></linearGradient></defs>
<g transform="rotate(-22 100 100)"><ellipse cx="100" cy="100" rx="86" ry="24" fill="none" stroke="#FBBF24" stroke-width="11"/></g>
<circle cx="100" cy="100" r="46" fill="url(#pg)"/>
<g clip-path="url(#pc)"><path d="M40 86 Q100 70 160 92 L160 104 Q100 86 40 100 Z" fill="#A855F7" opacity=".85"/>
<path d="M40 120 Q100 106 160 126 L160 134 Q100 120 40 132 Z" fill="#7C3AED" opacity=".9"/>
<circle cx="78" cy="70" r="9" fill="#fff" opacity=".18"/></g>
<g transform="rotate(-22 100 100)"><path d="M14 100 A86 24 0 0 0 186 100" fill="none" stroke="#FBBF24" stroke-width="11"/></g>
<circle cx="164" cy="42" r="12" fill="#E9D5FF"/><circle cx="160" cy="39" r="3" fill="#C4B5FD"/><circle cx="168" cy="47" r="2" fill="#C4B5FD"/>`);

S.gamepad = wrap(`<path d="M38 82 C38 62 54 52 74 52 L126 52 C146 52 162 62 162 82 C172 112 178 146 162 158 C148 168 134 154 124 134 L76 134 C66 154 52 168 38 158 C22 146 28 112 38 82 Z" fill="#F5F3FF"/>
<path d="M38 82 C38 62 54 52 74 52 L126 52 C146 52 162 62 162 82 L162 90 C150 78 128 74 100 74 C72 74 50 78 38 90 Z" fill="#DDD6FE"/>
<rect x="78" y="58" width="44" height="22" rx="9" fill="#C4B5FD"/>
<rect x="59" y="86" width="10" height="26" rx="2.5" fill="#6D28D9"/><rect x="51" y="94" width="26" height="10" rx="2.5" fill="#6D28D9"/>
<circle cx="136" cy="87" r="5.5" fill="#34D399"/><circle cx="148" cy="99" r="5.5" fill="#FB7185"/><circle cx="136" cy="111" r="5.5" fill="#60A5FA"/><circle cx="124" cy="99" r="5.5" fill="#F0ABFC"/>
<circle cx="84" cy="116" r="10" fill="#4C1D95"/><circle cx="84" cy="116" r="5.5" fill="#8B5CF6"/>
<circle cx="116" cy="116" r="10" fill="#4C1D95"/><circle cx="116" cy="116" r="5.5" fill="#8B5CF6"/>`);

S.ufo = wrap(`<polygon points="80,126 120,126 156,186 44,186" fill="#FDE68A"/>
<path d="M62 100 A38 38 0 0 1 138 100 Z" fill="#DDD6FE"/>
<circle cx="100" cy="78" r="14" fill="#86EFAC"/><ellipse cx="94" cy="77" rx="3.2" ry="4.6" fill="#14532D"/><ellipse cx="106" cy="77" rx="3.2" ry="4.6" fill="#14532D"/>
<path d="M76 70 q4 -10 14 -13" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".9"/>
<ellipse cx="100" cy="104" rx="74" ry="21" fill="#7C3AED"/><ellipse cx="100" cy="98" rx="74" ry="14" fill="#8B5CF6"/>
<circle cx="52" cy="108" r="5" fill="#FDE68A"/><circle cx="76" cy="116" r="5" fill="#FDE68A"/><circle cx="100" cy="119" r="5" fill="#FDE68A"/><circle cx="124" cy="116" r="5" fill="#FDE68A"/><circle cx="148" cy="108" r="5" fill="#FDE68A"/>`);

S.helmet = wrap(`<circle cx="34" cy="98" r="11" fill="#A855F7"/><circle cx="166" cy="98" r="11" fill="#A855F7"/>
<rect x="56" y="140" width="88" height="30" rx="12" fill="#C4B5FD"/><rect x="72" y="150" width="56" height="8" rx="4" fill="#7C3AED"/>
<circle cx="100" cy="94" r="66" fill="#F5F3FF"/>
<rect x="50" y="60" width="100" height="68" rx="34" fill="#2E1065"/>
<path d="M66 82 q6 -14 24 -16" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85"/>
<polygon points="${star(124, 104, 8, 3.4)}" fill="#FBBF24"/><circle cx="104" cy="112" r="2.4" fill="#C4B5FD"/><circle cx="84" cy="106" r="1.8" fill="#C4B5FD"/>`);

S.star = wrap(`<polygon points="${star(100, 104, 78, 34)}" fill="#FBBF24" stroke="#FBBF24" stroke-width="10" stroke-linejoin="round"/>
<polygon points="${star(100, 104, 78, 34)}" fill="#FDE68A" transform="translate(100 104) scale(.62) translate(-100 -104)"/>
<polygon points="${star(36, 40, 13, 5.5)}" fill="#E9D5FF"/><polygon points="${star(168, 36, 10, 4.2)}" fill="#C084FC"/><polygon points="${star(170, 168, 9, 3.8)}" fill="#E9D5FF"/>`);

S.coin = wrap(`<circle cx="100" cy="100" r="72" fill="#F59E0B"/><circle cx="100" cy="100" r="64" fill="#FBBF24"/>
<circle cx="100" cy="100" r="50" fill="none" stroke="#F59E0B" stroke-width="6"/>
<polygon points="${star(100, 102, 30, 13)}" fill="#F59E0B"/>
<path d="M58 70 q14 -22 40 -26" stroke="#FEF3C7" stroke-width="7" stroke-linecap="round" fill="none"/>`);

S.bolt = wrap(`<path d="M118 14 L48 114 L92 114 L78 188 L152 80 L106 80 Z" fill="#FBBF24" stroke="#FBBF24" stroke-width="8" stroke-linejoin="round"/>
<path d="M118 30 L66 108 L98 108 L90 164 L134 90 L104 90 Z" fill="#FDE68A"/>`);

S.shield = wrap(`<path d="M100 18 L166 42 V92 C166 138 138 168 100 184 C62 168 34 138 34 92 V42 Z" fill="#6D28D9"/>
<path d="M100 34 L152 53 V92 C152 128 130 153 100 167 C70 153 48 128 48 92 V53 Z" fill="#A855F7"/>
<polyline points="72,100 93,122 132,76" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`);

(function swap() {
  const cx = 100, cy = 100, r = 54;
  const P = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const arc = (a0, a1) => {
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const head = (a, color) => {
    const [x, y] = P(a);
    const t = [-Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
    const n = [-t[1], t[0]];
    const tip = [x + t[0] * 22, y + t[1] * 22];
    const b1 = [x + n[0] * 16, y + n[1] * 16], b2 = [x - n[0] * 16, y - n[1] * 16];
    return `<polygon points="${tip.map((v) => v.toFixed(1))} ${b1.map((v) => v.toFixed(1))} ${b2.map((v) => v.toFixed(1))}" fill="${color}"/>`;
  };
  S.swap = wrap(`<circle cx="100" cy="100" r="80" fill="#5B21B6"/>
<path d="${arc(200, 300)}" fill="none" stroke="#F5F3FF" stroke-width="15" stroke-linecap="round"/>${head(300, '#F5F3FF')}
<path d="${arc(20, 120)}" fill="none" stroke="#C084FC" stroke-width="15" stroke-linecap="round"/>${head(120, '#C084FC')}`);
})();

S.headset = wrap(`<path d="M42 112 A58 58 0 0 1 158 112" fill="none" stroke="#F5F3FF" stroke-width="14" stroke-linecap="round"/>
<rect x="28" y="102" width="36" height="58" rx="15" fill="#7C3AED"/><rect x="136" y="102" width="36" height="58" rx="15" fill="#7C3AED"/>
<rect x="36" y="114" width="14" height="34" rx="7" fill="#C4B5FD"/><rect x="150" y="114" width="14" height="34" rx="7" fill="#C4B5FD"/>
<path d="M154 156 C154 182 124 186 98 180" fill="none" stroke="#F5F3FF" stroke-width="7" stroke-linecap="round"/>
<circle cx="92" cy="179" r="9" fill="#FBBF24"/>`);

S.telegram = wrap(`<circle cx="100" cy="100" r="76" fill="#7C3AED"/>
<path d="M52 98 L146 62 C151 60 155 63 153 70 L137 146 C136 151 131 152 127 149 L103 131 L91 143 C89 145 86 144 86 141 L85 123 L135 78 L72 112 L55 106 C50 104 50 100 52 98 Z" fill="#fff"/>`);

for (const [name, svg] of Object.entries(S)) fs.writeFileSync(path.join(out, 'stickers', `${name}.svg`), svg);

// پس‌زمینه‌ی ستاره‌ای قابل تکرار
let seed = 20250117;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let stars = '';
for (let i = 0; i < 170; i++) {
  const r = (0.4 + rnd() * 1.3).toFixed(2);
  const col = ['#ffffff', '#E9D5FF', '#C4B5FD', '#FDE68A'][Math.floor(rnd() * 4)];
  stars += `<circle cx="${(rnd() * 900).toFixed(1)}" cy="${(rnd() * 900).toFixed(1)}" r="${r}" fill="${col}" opacity="${(0.25 + rnd() * 0.65).toFixed(2)}"/>`;
}
fs.writeFileSync(path.join(out, 'stars.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">${stars}</svg>\n`);

// آیکن تب مرورگر
fs.writeFileSync(path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0A0618"/><g transform="rotate(-22 32 32)"><ellipse cx="32" cy="32" rx="27" ry="8" fill="none" stroke="#FBBF24" stroke-width="3.5"/></g><circle cx="32" cy="32" r="14" fill="#8B5CF6"/><g transform="rotate(-22 32 32)"><path d="M5 32 A27 8 0 0 0 59 32" fill="none" stroke="#FBBF24" stroke-width="3.5"/></g></svg>\n`);
console.log('stickers done');
