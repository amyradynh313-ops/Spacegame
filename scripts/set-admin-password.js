'use strict';
// استفاده:  npm run admin:password -- "رمز-جدید"
const { users, sessions } = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const cfg = require('../lib/config');

(async () => {
  const pass = process.argv[2];
  if (!pass || pass.length < 6) {
    console.error('رمز جدید را (حداقل ۶ کاراکتر) بعد از دستور بنویس.');
    process.exit(1);
  }
  const u = users.byName(cfg.adminUser.toLowerCase());
  if (!u) { console.error('کاربر ادمین پیدا نشد.'); process.exit(1); }
  users.setPassword(Number(u.id), await hashPassword(pass));
  sessions.removeAll(Number(u.id));
  console.log('رمز ادمین عوض شد.');
})();
