(function () {
  'use strict';
  var SG = window.SG, $ = SG.$, $$ = SG.$$, esc = SG.esc, faN = SG.faN, api = SG.api;
  var app = $('#adminApp');
  var PLATFORMS = ['PS5', 'PS4', 'PS4 و PS5'];
  var COVERS = ['rocket', 'planet', 'gamepad', 'ufo', 'helmet', 'star'];
  var state = { games: [], users: [], tab: 'games', editing: null, image: undefined };
  // image: undefined = بدون تغییر، null = حذف، رشته = عکس جدید (data URL)

  var normDigits = function (s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[٬,،\s]/g, '');
  };

  /* ---------------- login gate ---------------- */
  function renderLogin(msg) {
    app.innerHTML = '<div class="login-card"><div class="modal">' +
      '<h2>ورود مدیر</h2><p class="sub">برای ورود به پنل مدیریت، نام کاربری و رمز مدیر را وارد کن.</p>' +
      (msg ? '<div class="err" role="alert">' + esc(msg) + '</div>' : '') +
      '<div class="field"><label for="lUser">نام کاربری</label><input id="lUser" class="ltr" autocomplete="username" autocapitalize="off" spellcheck="false"></div>' +
      '<div class="field"><label for="lPass">رمز عبور</label><input id="lPass" class="ltr" type="password" autocomplete="current-password"></div>' +
      '<button class="btn btn-primary btn-block" id="lGo" type="button">ورود</button></div></div>';
    var go = function () {
      var u = $('#lUser').value.trim(), p = $('#lPass').value;
      if (!u || !p) return renderLogin('نام کاربری و رمز عبور را وارد کن.');
      $('#lGo').disabled = true;
      api('/api/login', 'POST', { username: u, password: p }).then(function (d) {
        if (d.user.role !== 'admin') {
          return api('/api/logout', 'POST').then(function () { renderLogin('این حساب دسترسی مدیریت ندارد.'); });
        }
        SG.setMe(d.user);
        boot();
      }).catch(function (e) { renderLogin(e.message); });
    };
    $('#lGo').addEventListener('click', go);
    app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); go(); } });
    $('#lUser').focus();
  }

  /* ---------------- dashboard shell ---------------- */
  function shell() {
    app.innerHTML =
      '<div class="admin-top"><h1>پنل مدیریت</h1><div class="row">' +
      '<a class="btn btn-ghost btn-sm" href="/">مشاهده سایت</a>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-auth="logout">خروج</button></div></div>' +
      '<div class="stats"><div class="stat"><b id="stGames">۰</b>بازی و اکانت</div><div class="stat"><b id="stUsers">۰</b>کاربر ثبت‌نام‌شده</div></div>' +
      '<div class="atabs" role="tablist">' +
      '<button type="button" role="tab" data-tab="games">بازی‌ها</button>' +
      '<button type="button" role="tab" data-tab="users">کاربران</button>' +
      '<button type="button" role="tab" data-tab="account">رمز عبور</button></div>' +
      '<div id="tabBody"></div>';
    app.onclick = onClick;
    renderTab();
  }

  function stats() {
    var g = $('#stGames'), u = $('#stUsers');
    if (g) g.textContent = faN(state.games.length);
    if (u) u.textContent = faN(state.users.filter(function (x) { return x.role !== 'admin'; }).length);
  }

  function renderTab() {
    $$('.atabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === state.tab)); });
    stats();
    if (state.tab === 'games') renderGamesTab();
    else if (state.tab === 'users') renderUsersTab();
    else renderAccountTab();
  }

  /* ---------------- games tab ---------------- */
  function gamesTabHtml() {
    return '<div class="admin-grid">' +
      '<section class="panel" id="formPanel"><h2 id="formTitle">افزودن بازی جدید</h2>' +
      '<div class="err" id="formErr" hidden></div>' +
      '<div class="field"><label for="fName">نام بازی</label><input id="fName" maxlength="120" autocomplete="off"></div>' +
      '<div class="field"><label for="fPlatform">پلتفرم</label><select id="fPlatform">' +
      PLATFORMS.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pgrid">' +
      '<div class="field"><label for="fP1">قیمت ظرفیت ۱</label><input id="fP1" inputmode="numeric" autocomplete="off" placeholder="تومان"><div class="fhint" id="h1"></div></div>' +
      '<div class="field"><label for="fP2">قیمت ظرفیت ۲</label><input id="fP2" inputmode="numeric" autocomplete="off" placeholder="تومان"><div class="fhint" id="h2"></div></div>' +
      '<div class="field"><label for="fP3">قیمت ظرفیت ۳</label><input id="fP3" inputmode="numeric" autocomplete="off" placeholder="تومان"><div class="fhint" id="h3"></div></div></div>' +
      '<div class="fhint note">حداقل یک قیمت لازم است. ظرفیتی که قیمت نداشته باشد نمایش داده نمی‌شود.</div>' +
      '<div class="field"><label for="fDesc">توضیحات</label><textarea id="fDesc" maxlength="4000"></textarea></div>' +
      '<div class="field"><label>عکس بازی</label><div class="drop"><div class="thumb" id="fThumb">بدون عکس</div>' +
      '<div class="side"><input type="file" id="fFile" accept="image/*" hidden>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="fPick">انتخاب عکس</button>' +
      '<button class="btn btn-danger btn-sm" type="button" id="fClearImg" hidden>حذف عکس</button></div></div></div>' +
      '<div class="field"><label class="check"><input type="checkbox" id="fAvail" checked> موجود است</label></div>' +
      '<div class="form-actions"><button class="btn btn-primary" type="button" id="fSave">افزودن بازی</button>' +
      '<button class="btn btn-ghost" type="button" id="fCancel" hidden>انصراف</button></div></section>' +
      '<section class="panel"><h2>لیست بازی‌ها</h2><div class="rows" id="rows"></div></section></div>';
  }

  function renderGamesTab() {
    $('#tabBody').innerHTML = gamesTabHtml();
    ['1', '2', '3'].forEach(function (n) { $('#fP' + n).addEventListener('input', function () { hint(n); }); });
    resetForm();
    renderRows();
  }

  function hint(n) {
    var v = parseInt(normDigits($('#fP' + n).value), 10);
    $('#h' + n).textContent = v > 0 ? faN(v) + ' تومان' : '';
  }

  function thumbHtml(g) {
    if (g.image) return '<img src="/uploads/' + esc(g.image) + '" alt="">';
    var i = g.id % COVERS.length;
    return '<div class="ph ph-' + (g.id % 5) + '"><img src="/img/stickers/' + COVERS[i] + '.svg" alt=""></div>';
  }

  function renderRows() {
    var el = $('#rows'); if (!el) return;
    if (!state.games.length) { el.innerHTML = '<p class="muted">هنوز بازی‌ای اضافه نشده. از فرم کنار اولین مورد را بساز.</p>'; return; }
    el.innerHTML = state.games.map(function (g) {
      var caps = [1, 2, 3].filter(function (c) { return g.prices[c]; }).map(function (c) {
        return '<span>ظرفیت ' + faN(c) + ': ' + faN(g.prices[c]) + ' تومان</span>';
      }).join('');
      return '<div class="row-item"><div class="rt">' + thumbHtml(g) + '</div>' +
        '<div class="rinfo"><b>' + esc(g.name) + '</b><div class="pchips">' + caps + '</div><div>' +
        '<span class="tag">' + esc(g.platform) + '</span>' + (g.available ? '' : '<span class="tag off">ناموجود</span>') + '</div></div>' +
        '<div class="rbtns">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-a="edit" data-id="' + g.id + '">ویرایش</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-a="toggle" data-id="' + g.id + '">' + (g.available ? 'ناموجود کن' : 'موجود کن') + '</button>' +
        '<button class="btn btn-danger btn-sm" type="button" data-a="del" data-id="' + g.id + '">حذف</button></div></div>';
    }).join('');
  }

  function formErr(msg) {
    var e = $('#formErr'); if (!e) return;
    if (!msg) { e.hidden = true; return; }
    e.textContent = msg; e.hidden = false;
    e.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function updateThumb() {
    var t = $('#fThumb'), clr = $('#fClearImg');
    var src = null;
    if (typeof state.image === 'string') src = state.image;
    else if (state.image === undefined && state.editing) {
      var g = byId(state.editing);
      if (g && g.image) src = '/uploads/' + g.image;
    }
    t.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : 'بدون عکس';
    clr.hidden = !src;
  }

  var byId = function (id) { return state.games.filter(function (g) { return g.id === Number(id); })[0]; };

  function resetForm() {
    state.editing = null; state.image = undefined;
    $('#fName').value = ''; $('#fDesc').value = '';
    ['1', '2', '3'].forEach(function (n) { $('#fP' + n).value = ''; hint(n); });
    $('#fPlatform').value = PLATFORMS[0]; $('#fAvail').checked = true; $('#fFile').value = '';
    $('#formTitle').textContent = 'افزودن بازی جدید';
    $('#fSave').textContent = 'افزودن بازی';
    $('#fCancel').hidden = true;
    $('#formPanel').classList.remove('editing');
    formErr(''); updateThumb();
  }

  function startEdit(id) {
    var g = byId(id); if (!g) return;
    state.editing = g.id; state.image = undefined;
    $('#fName').value = g.name; $('#fDesc').value = g.description || '';
    [1, 2, 3].forEach(function (n) { $('#fP' + n).value = g.prices[n] ? String(g.prices[n]) : ''; hint(String(n)); });
    $('#fPlatform').value = g.platform; $('#fAvail').checked = g.available;
    $('#formTitle').textContent = 'ویرایش بازی';
    $('#fSave').textContent = 'ذخیره تغییرات';
    $('#fCancel').hidden = false;
    $('#formPanel').classList.add('editing');
    formErr(''); updateThumb();
    $('#formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#fName').focus({ preventScroll: true });
  }

  function priceVal(n) {
    var raw = normDigits($('#fP' + n).value);
    if (raw === '') return null;
    var v = Number(raw);
    return (Number.isInteger(v) && v > 0) ? v : NaN;
  }

  function saveGame() {
    var name = $('#fName').value.trim();
    var p1 = priceVal(1), p2 = priceVal(2), p3 = priceVal(3);
    if (!name) return formErr('نام بازی را وارد کن.');
    if ([p1, p2, p3].some(function (v) { return v !== null && isNaN(v); })) return formErr('قیمت‌ها را فقط با عدد و بیشتر از صفر وارد کن.');
    if (!p1 && !p2 && !p3) return formErr('حداقل یکی از قیمت‌های ظرفیت ۱، ۲ یا ۳ را وارد کن.');
    var body = {
      name: name, platform: $('#fPlatform').value, description: $('#fDesc').value.trim(),
      price1: p1, price2: p2, price3: p3, available: $('#fAvail').checked,
    };
    if (state.image !== undefined) body.image = state.image;
    var editing = state.editing;
    var btn = $('#fSave'); btn.disabled = true;
    api(editing ? '/api/admin/games/' + editing : '/api/admin/games', editing ? 'PUT' : 'POST', body)
      .then(function () { SG.toast(editing ? 'تغییرات ذخیره شد' : 'بازی اضافه شد'); return loadGames(); })
      .then(function () { if (state.tab === 'games') { resetForm(); renderRows(); } stats(); })
      .catch(function (e) { formErr(e.message); })
      .then(function () { var b = $('#fSave'); if (b) b.disabled = false; });
  }

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('type'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('read')); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('img')); };
        img.onload = function () {
          var max = 900, r = Math.min(1, max / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function confirmDelete(g) {
    SG.openModal('<div class="modal" role="alertdialog" aria-modal="true"><h2>حذف بازی</h2>' +
      '<p class="sub">«' + esc(g.name) + '» برای همیشه حذف می‌شود. ادامه می‌دهی؟</p>' +
      '<div class="form-actions"><button class="btn btn-danger" type="button" id="cYes">حذف</button>' +
      '<button class="btn btn-ghost" type="button" data-close>انصراف</button></div></div>', '[data-close]');
    $('#cYes').onclick = function () {
      SG.closeModal();
      api('/api/admin/games/' + g.id, 'DELETE').then(function () {
        SG.toast('بازی حذف شد');
        if (state.editing === g.id) resetForm();
        return loadGames();
      }).then(function () { renderRows(); stats(); }).catch(function (e) { SG.toast(e.message, true); });
    };
  }

  /* ---------------- users / account ---------------- */
  function renderUsersTab() {
    var rows = state.users.map(function (u) {
      return '<tr><td dir="ltr">' + esc(u.username) + '</td><td>' + (u.role === 'admin' ? 'مدیر' : 'کاربر') + '</td><td>' +
        esc(new Date(u.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('fa-IR')) + '</td></tr>';
    }).join('');
    $('#tabBody').innerHTML = '<section class="panel"><h2>کاربران</h2><div class="scroll-x"><table class="table"><thead><tr><th>نام کاربری</th><th>نقش</th><th>تاریخ ثبت‌نام</th></tr></thead><tbody>' +
      rows + '</tbody></table></div></section>';
  }

  function renderAccountTab() {
    $('#tabBody').innerHTML = '<section class="panel panel-narrow"><h2>تغییر رمز عبور</h2>' +
      '<div class="err" id="pErr" hidden></div>' +
      '<div class="field"><label for="pCur">رمز فعلی</label><input id="pCur" class="ltr" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="pNew">رمز جدید</label><input id="pNew" class="ltr" type="password" autocomplete="new-password"><div class="fhint">حداقل ۶ کاراکتر</div></div>' +
      '<button class="btn btn-primary" type="button" id="pSave">ذخیره رمز جدید</button></section>';
    $('#pSave').onclick = function () {
      var e = $('#pErr');
      var cur = $('#pCur').value, next = $('#pNew').value;
      if (next.length < 6) { e.textContent = 'رمز جدید باید حداقل ۶ کاراکتر باشد.'; e.hidden = false; return; }
      api('/api/account/password', 'POST', { current: cur, next: next }).then(function () {
        e.hidden = true; $('#pCur').value = ''; $('#pNew').value = ''; SG.toast('رمز عبور عوض شد');
      }).catch(function (er) { e.textContent = er.message; e.hidden = false; });
    };
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    var tab = e.target.closest('.atabs [data-tab]');
    if (tab) { state.tab = tab.getAttribute('data-tab'); renderTab(); return; }
    var t = e.target;
    if (t.closest('#fSave')) return saveGame();
    if (t.closest('#fCancel')) return resetForm();
    if (t.closest('#fPick')) return $('#fFile').click();
    if (t.closest('#fClearImg')) { state.image = null; $('#fFile').value = ''; updateThumb(); return; }
    var b = t.closest('[data-a]');
    if (!b) return;
    var g = byId(b.getAttribute('data-id'));
    if (!g) return;
    var a = b.getAttribute('data-a');
    if (a === 'edit') startEdit(g.id);
    else if (a === 'del') confirmDelete(g);
    else if (a === 'toggle') {
      api('/api/admin/games/' + g.id, 'PUT', {
        name: g.name, platform: g.platform, description: g.description,
        price1: g.prices[1], price2: g.prices[2], price3: g.prices[3], available: !g.available,
      }).then(loadGames).then(function () { renderRows(); }).catch(function (er) { SG.toast(er.message, true); });
    }
  }
  app.addEventListener('change', function (e) {
    if (e.target.id !== 'fFile') return;
    var f = e.target.files && e.target.files[0]; if (!f) return;
    resizeImage(f).then(function (d) { state.image = d; updateThumb(); formErr(''); })
      .catch(function () { formErr('این فایل به‌عنوان عکس خوانده نشد. یک فایل JPG یا PNG انتخاب کن.'); });
  });
  app.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.closest('#formPanel') && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); saveGame(); }
  });

  /* ---------------- data ---------------- */
  function loadGames() { return api('/api/admin/games').then(function (d) { state.games = d.games; }); }
  function loadUsers() { return api('/api/admin/users').then(function (d) { state.users = d.users; }); }

  function boot() {
    Promise.all([loadGames(), loadUsers()]).then(shell).catch(function (e) {
      app.innerHTML = '<p class="muted loading">' + esc(e.message) + '</p>';
    });
  }

  api('/api/me').then(function (d) {
    SG.me = d.user;
    if (d.user && d.user.role === 'admin') boot(); else renderLogin(d.user ? 'این حساب دسترسی مدیریت ندارد. با حساب مدیر وارد شو.' : '');
  }).catch(function () { renderLogin('ارتباط با سرور برقرار نشد.'); });
})();
