(function () {
  'use strict';
  var SG = window.SG, $ = SG.$, $$ = SG.$$;
  var box = $('#detail');
  if (!box) return;
  var name = box.getAttribute('data-name');
  var platform = box.getAttribute('data-platform');
  var available = box.getAttribute('data-available') === '1';
  var btn = $('#buyBtn');

  function selected() {
    var r = $('input[name="cap"]:checked', box);
    return r ? { cap: Number(r.value), price: Number(r.getAttribute('data-price')) } : null;
  }
  $$('input[name="cap"]', box).forEach(function (r) {
    r.addEventListener('change', function () {
      var s = selected();
      if (s) $('#priceNow').textContent = SG.faN(s.price);
    });
  });

  function goTelegram() {
    var s = selected();
    if (!s || !SG.me) return;
    var text = 'سلام، می‌خوام اکانت «' + name + '» (' + platform + ') با ظرفیت ' + SG.faN(s.cap) +
      ' رو به قیمت ' + SG.faN(s.price) + ' تومان بخرم.\nنام کاربری من در سایت: ' + SG.me.username;
    var a = document.createElement('a');
    a.href = 'https://t.me/' + document.body.getAttribute('data-telegram') + '?text=' + encodeURIComponent(text);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  btn.addEventListener('click', function () {
    if (!available) return;
    if (!SG.me) {
      SG.openAuth('login', 'برای خرید ابتدا وارد حسابت شو یا ثبت‌نام کن.', function () {
        SG.toast('حالا دکمه خرید را بزن');
      });
      return;
    }
    goTelegram();
  });
})();
