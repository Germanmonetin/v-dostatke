/* Google Analytics 4 + события кликов по мессенджерам + UTM-сквозняк.
   Один файл на все страницы. Чтобы включить — подставить ID вида G-XXXXXXXXXX в GA4_ID.
   Пока ID пустой, ничего не грузится и ошибок нет. */
(function () {
  'use strict';

  var GA4_ID = 'G-4F17X3FBHV'; // GA4
  var ADS_ID = 'AW-18544627317'; // Google Ads (ремаркетинг, связка)

  /* ---------- 1. UTM и gclid: запомнить на сессию ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];
  var utm = {};
  try {
    var params = new URLSearchParams(location.search);
    var saved = sessionStorage.getItem('vd_utm');
    if (saved) utm = JSON.parse(saved);
    var fresh = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { utm[k] = v.slice(0, 100); fresh = true; }
    });
    if (fresh) sessionStorage.setItem('vd_utm', JSON.stringify(utm));
  } catch (e) { utm = {}; }

  /* ---------- 2. gtag ---------- */
  var gaOn = /^G-[A-Z0-9]{6,}$/.test(GA4_ID);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (gaOn) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA4_ID, {
      anonymize_ip: true,
      debug_mode: /[?&]debug_mode=1/.test(location.search) ? true : undefined
    });
    if (ADS_ID) gtag('config', ADS_ID);
  }

  /* ---------- 3. Какой ссылке какое событие ---------- */
  function eventFor(href) {
    if (!href) return null;
    if (href.indexOf('wa.me') !== -1) return 'click_whatsapp';
    if (/t\.me\/Arhitector_Resursa_bot/i.test(href)) return 'click_bot';
    if (/t\.me\/germanprooff/i.test(href)) return 'click_telegram';
    if (/t\.me\/Arhitector_Resursa(\/|$|\?)/i.test(href)) return 'click_channel';
    return null;
  }

  /* ---------- 4. Метка для бота: ?start=ads_<utm_content> ---------- */
  function botStartParam() {
    var src = utm.utm_content || utm.utm_campaign || utm.utm_source;
    if (!src) return null;
    var tag = ('ads_' + src).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 64);
    return tag;
  }

  function decorateBotLinks() {
    var tag = botStartParam();
    if (!tag) return;
    var links = document.querySelectorAll('a[href*="Arhitector_Resursa_bot"]');
    for (var i = 0; i < links.length; i++) {
      try {
        var u = new URL(links[i].href);
        if (!u.searchParams.get('start') || /^intro_/.test(u.searchParams.get('start'))) {
          u.searchParams.set('start', tag);
          links[i].href = u.toString();
        }
      } catch (e) {}
    }
  }

  /* ---------- 5. Делегированный обработчик кликов ---------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var name = eventFor(a.getAttribute('href'));
    if (!name) return;

    var place = a.getAttribute('data-umami-event-place') || a.getAttribute('data-place') || '';
    var section = a.closest('section, footer, header');
    if (!place && section) place = section.id || section.className.split(' ')[0] || '';

    if (!gaOn) return;
    gtag('event', name, {
      place: place,
      link_url: a.href,
      page_path: location.pathname,
      transport_type: 'beacon',
      utm_source: utm.utm_source || undefined,
      utm_campaign: utm.utm_campaign || undefined,
      utm_content: utm.utm_content || undefined
    });
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateBotLinks);
  } else {
    decorateBotLinks();
  }
})();
