# Space Game | اسپیس گیم

فروشگاه اکانت و بازی پلی‌استیشن با Node.js و دیتابیس SQLite (بدون نیاز به نصب پکیج).

## پیش‌نیاز
Node.js نسخه **۲۲.۱۳ یا بالاتر** (نسخه ۲۴ هم خوب است).

## اجرا
```
cp .env.example .env     # اگر .env نداری؛ مقادیر را عوض کن
npm start
```
سایت روی http://localhost:3000 و پنل مدیریت روی /admin باز می‌شود.
اطلاعات ورود ادمین از فایل `.env` (ADMIN_USER و ADMIN_PASSWORD) فقط در اولین اجرا ساخته می‌شود.
رمز را بعداً از پنل مدیریت (تب «رمز عبور») یا با `npm run admin:password -- "رمز-جدید"` عوض کن.

## ساختار
- `server.js` سرور، API و مسیرها
- `database/schema.sql` ساختار جدول‌ها (users, sessions, games, meta)
- `lib/` دیتابیس، احراز هویت، قالب‌های HTML (رندر سمت سرور برای سئو)
- `public/` CSS، JS و استیکرهای SVG (`scripts/make-stickers.js` همه را تولید می‌کند)
- `data/` فایل دیتابیس | `uploads/` عکس بازی‌ها (از این دو پوشه بکاپ بگیر)

## استقرار
1. `SITE_URL` در `.env` را با دامنه‌ی واقعی (https) عوض کن؛ برای سئو و sitemap لازم است.
2. پشت nginx با HTTPS اجرا کن و `TRUST_PROXY=1` بگذار.
3. با pm2 یا systemd دائمی اجرا کن: `pm2 start server.js --name space-game --node-args="--disable-warning=ExperimentalWarning"`.
4. آدرس `https://دامنه/sitemap.xml` را در Google Search Console ثبت کن.

## فونت‌ها
فونت‌ها (Lalezar، Vazirmatn، Orbitron) از Google Fonts لود می‌شوند. برای سرعت بهتر در ایران، فایل‌های woff2 را در `public/fonts` بگذار و `@font-face` اضافه کن.
