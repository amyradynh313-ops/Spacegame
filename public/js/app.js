(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var faN = function (n) { return Number(n).toLocaleString('fa-IR'); };

  function api(url, method, body) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    else if (opts.method !== 'GET') { opts.headers['Content-Type'] = 'application/json'; opts.body = '{}'; }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || 'مشکلی پیش آمد. دوباره تلاش کن.');
        return d;
      });
    });
  }

  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 3400);
  }

  var SG = (window.SG = { api: api, esc: esc, faN: faN, toast: toast, me: null, $: $, $$: $$ });
  var listeners = [];
  SG.onUser = function (fn) { listeners.push(fn); if (SG.me !== undefined && SG.ready) fn(SG.me); };
  SG.setMe = function (u) { setMe(u); };
  function setMe(u) { SG.me = u; SG.ready = true; renderAuth(); listeners.forEach(function (fn) { fn(u); }); }

  /* ---------- header auth area ---------- */
  function renderAuth() {
    var box = $('#navAuth');
    if (!box) return;
    var u = SG.me;
    if (!u) {
      box.innerHTML = '<button class="btn btn-ghost btn-sm" type="button" data-auth="login">ورود</button>' +
        '<button class="btn btn-primary btn-sm" type="button" data-auth="register">ثبت‌نام</button>';
      return;
    }
    var h = '<span class="hello">سلام، <b>' + esc(u.username) + '</b></span>';
    if (u.role === 'admin') h += '<a class="btn btn-primary btn-sm" href="/admin">پنل مدیریت</a>';
    h += '<button class="btn btn-ghost btn-sm" type="button" data-auth="logout">خروج</button>';
    box.innerHTML = h;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-auth]');
    if (!b) return;
    var a = b.getAttribute('data-auth');
    if (a === 'login' || a === 'register') openAuth(a);
    else if (a === 'logout') {
      api('/api/logout', 'POST').catch(function () {}).then(function () {
        setMe(null);
        toast('از حساب خارج شدی');
        if (location.pathname.indexOf('/admin') === 0) location.reload();
      });
    }
  });

  /* ---------- modal ---------- */
  var lastFocus = null;
  function closeModal() {
    var r = $('#modalRoot');
    if (!r.firstChild) return;
    r.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }
  SG.closeModal = closeModal;
  document.addEventListener('keydown', function (e) {
    var r = $('#modalRoot');
    if (!r || !r.firstChild) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      var f = $$('button,input,select,textarea,a[href]', r).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $('#modalRoot').addEventListener('mousedown', function (e) { if (e.target.classList.contains('overlay')) closeModal(); });
  $('#modalRoot').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });

  SG.openModal = function (html, focusSel) {
    lastFocus = document.activeElement;
    var r = $('#modalRoot');
    r.innerHTML = '<div class="overlay">' + html + '</div>';
    document.body.style.overflow = 'hidden';
    var f = focusSel ? $(focusSel, r) : null;
    if (f) f.focus();
  };

  /* ---------- auth modal ---------- */
  function openAuth(mode, message, after) {
    var cur = mode, busy = false;
    function render(err, keepUser) {
      var isReg = cur === 'register';
      var html = '<div class="modal" role="dialog" aria-modal="true" aria-label="ورود و ثبت‌نام">' +
        '<button class="x" type="button" data-close aria-label="بستن">×</button>' +
        '<h2>' + (isReg ? 'ساخت حساب' : 'ورود به حساب') + '</h2>' +
        '<p class="sub">' + esc(message || (isReg ? 'با ساخت حساب می‌توانی سفارش بدهی.' : 'برای سفارش، وارد حسابت شو.')) + '</p>' +
        '<div class="tabs" role="tablist">' +
        '<button type="button" role="tab" data-tab="login" aria-selected="' + !isReg + '">ورود</button>' +
        '<button type="button" role="tab" data-tab="register" aria-selected="' + isReg + '">ثبت‌نام</button></div>' +
        (err ? '<div class="err" role="alert">' + esc(err) + '</div>' : '') +
        '<div class="field"><label for="aUser">نام کاربری</label><input id="aUser" class="ltr" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="20"></div>' +
        '<div class="field"><label for="aPass">رمز عبور</label><input id="aPass" class="ltr" type="password" autocomplete="' + (isReg ? 'new-password' : 'current-password') + '" maxlength="64"></div>' +
        (isReg ? '<div class="field"><label for="aPass2">تکرار رمز عبور</label><input id="aPass2" class="ltr" type="password" autocomplete="new-password" maxlength="64">' +
          '<div class="fhint">نام کاربری: ۳ تا ۲۰ حرف انگلیسی، عدد یا _ / رمز: حداقل ۶ کاراکتر</div></div>' : '') +
        '<button class="btn btn-primary btn-block" type="button" id="aSubmit">' + (isReg ? 'ساخت حساب' : 'ورود') + '</button></div>';
      var root = $('#modalRoot');
      if (!root.firstChild) SG.openModal(html); else $('.overlay', root).innerHTML = html;
      var u = $('#aUser', root);
      if (keepUser) u.value = keepUser;
      (keepUser ? $('#aPass', root) : u).focus();
    }
    render();
    var root = $('#modalRoot');
    root.onclick = function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { cur = tab.getAttribute('data-tab'); render(); return; }
      if (e.target.closest('[data-close]')) { closeModal(); return; }
      if (e.target.closest('#aSubmit')) submit();
    };
    root.onkeydown = function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(); }
    };
    function submit() {
      if (busy) return;
      var username = $('#aUser', root).value.trim();
      var pass = $('#aPass', root).value;
      if (cur === 'register') {
        var pass2 = $('#aPass2', root).value;
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return render('نام کاربری باید ۳ تا ۲۰ حرف انگلیسی، عدد یا _ باشد.', username);
        if (pass.length < 6) return render('رمز عبور باید حداقل ۶ کاراکتر باشد.', username);
        if (pass !== pass2) return render('تکرار رمز عبور با رمز اصلی یکی نیست.', username);
      } else if (!username || !pass) {
        return render('نام کاربری و رمز عبور را وارد کن.', username);
      }
      busy = true;
      var btn = $('#aSubmit', root); btn.disabled = true;
      api(cur === 'register' ? '/api/register' : '/api/login', 'POST', { username: username, password: pass })
        .then(function (d) {
          root.onclick = null; root.onkeydown = null;
          closeModal();
          setMe(d.user);
          if (cur === 'register') toast('حساب ساخته شد. خوش اومدی!');
          else toast('وارد شدی');
          if (after) after(d.user);
        })
        .catch(function (err) { busy = false; render(err.message, username); });
    }
    var obs = new MutationObserver(function () {
      if (!root.firstChild) { root.onclick = null; root.onkeydown = null; obs.disconnect(); }
    });
    obs.observe(root, { childList: true });
  }
  SG.openAuth = openAuth;

  /* ---------- home filters ---------- */
  var grid = $('#grid');
  if (grid) {
    var items = $$('.card-item', grid);
    var platform = 'all', q = '', sort = 'new';
    var norm = function (s) { return String(s).toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک'); };
    var apply = function () {
      var shown = 0;
      var visible = [];
      items.forEach(function (el) {
        var ok = (platform === 'all' || el.getAttribute('data-platform') === platform) &&
          (!q || el.getAttribute('data-search').indexOf(q) !== -1);
        el.hidden = !ok;
        if (ok) { shown++; visible.push(el); }
      });
      var key = function (el) { return Number(el.getAttribute(sort === 'new' ? 'data-id' : 'data-price')); };
      var order = items.slice().sort(function (a, b) {
        if (sort === 'cheap') return key(a) - key(b);
        if (sort === 'exp') return key(b) - key(a);
        var ao = a.querySelector('.is-off') ? 1 : 0, bo = b.querySelector('.is-off') ? 1 : 0;
        return ao - bo || key(b) - key(a);
      });
      order.forEach(function (el, i) { el.style.order = i; });
      var c = $('#count'); if (c) c.textContent = items.length ? faN(shown) + ' مورد' : '';
      var em = $('#empty');
      if (em) {
        em.hidden = shown > 0 || !items.length;
        if (items.length) { $('b', em).textContent = 'موردی پیدا نشد'; $('span', em).textContent = 'عبارت جستجو یا فیلتر پلتفرم را تغییر بده.'; }
      }
    };
    $('#q').addEventListener('input', function (e) { q = norm(e.target.value.trim()); apply(); });
    $('#sort').addEventListener('change', function (e) { sort = e.target.value; apply(); });
    $('#chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      platform = b.getAttribute('data-p');
      $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      apply();
    });
    apply();
  }

  /* ---------- who am I ---------- */
  api('/api/me').then(function (d) { setMe(d.user); }).catch(function () { setMe(null); });
})();
