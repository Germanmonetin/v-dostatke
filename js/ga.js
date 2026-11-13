/* Google Analytics 4 + события кликов по мессенджерам + UTM-сквозняк.
   Один файл на все страницы. Чтобы включить — подставить ID вида G-XXXXXXXXXX в GA4_ID.
   Пока ID пустой, ничего не грузится и ошибок нет. */
(function () {
  'use strict';

  var GA4_ID = 'G-4F17X3FBHV'; // GA4
  var ADS_ID = 'AW-18544627317'; // Google Ads
  var ADS_CONVERSION = 'AW-18544627317/y-WhCIC117EdEPWc4opF'; // конверсия «Контакты»: клик по WhatsApp / Telegram / боту

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

  /* ---------- 2а. Google Consent Mode v2 — ДО загрузки тегов ---------- */
  // ЕЭЗ, Великобритания и Швейцария: до выбора всё запрещено. Остальные страны: разрешено по умолчанию.
  // Выбор посетителя хранится в localStorage ('granted' / 'denied') и применяется сразу.
  var CONSENT_KEY = 'vd_consent';
  var consent = null;
  try { consent = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
    wait_for_update: 500,
    region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
      'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH']
  });
  gtag('consent', 'default', GRANTED);
  if (consent === 'granted') gtag('consent', 'update', GRANTED);
  if (consent === 'denied') gtag('consent', 'update', DENIED);
  // Метка рекламного клика (gclid) передаётся в адресах и без cookie; рекламные данные без согласия обезличиваются
  gtag('set', 'url_passthrough', true);
  gtag('set', 'ads_data_redaction', true);

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
    if (!ADS_CONVERSION || name === 'click_channel') return;

    /* Конверсия Google Ads: сначала отправить, потом открыть мессенджер.
       На телефоне t.me/wa.me уводят в приложение мгновенно — beacon может не успеть. */
    ev.preventDefault();
    var href = a.href, target = a.getAttribute('target') || '_self', opened = false;
    function go() {
      if (opened) return; opened = true;
      if (target === '_blank') { var w = window.open(href, '_blank', 'noopener'); if (!w) location.href = href; }
      else location.href = href;
    }
    gtag('event', 'conversion', { send_to: ADS_CONVERSION, event_label: name, event_callback: go });
    setTimeout(go, 400);
  }, true);

  /* ---------- 6. Баннер согласия на cookie ---------- */
  // Не сразу: при первом из событий — прокрутили ниже первого экрана или прошло 8 с. Если выбор сохранён — не показываем.
  // Пока баннер на экране, кнопки связи поднимаются над ним (--consent-offset).
  function consentBanner() {
    if (consent === 'granted' || consent === 'denied') return;
    var shown = false, timer = 0;
    function onScroll() { if (window.scrollY > window.innerHeight) show(); }
    function show() {
      if (shown) return;
      shown = true;
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      var box = document.createElement('div');
      box.className = 'consent';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Согласие на cookie');
      box.innerHTML = '<p>Сайт использует cookie Google для статистики и рекламы. <a href="/privacy.html">Подробнее</a></p>' +
        '<div class="consent-btns"><button type="button" data-consent="granted">Принять</button>' +
        '<button type="button" data-consent="denied">Только необходимые</button></div>';
      document.body.appendChild(box);
      var root = document.documentElement;
      var mobile = window.matchMedia('(max-width: 768px)');
      function offset() {
        root.style.setProperty('--consent-offset', mobile.matches && box.isConnected ? (box.offsetHeight + 12) + 'px' : '0px');
      }
      offset();
      window.addEventListener('resize', offset);
      box.addEventListener('click', function (ev) {
        var btn = ev.target.closest ? ev.target.closest('button[data-consent]') : null;
        if (!btn) return;
        consent = btn.getAttribute('data-consent');
        try { localStorage.setItem(CONSENT_KEY, consent); } catch (e) {}
        gtag('consent', 'update', consent === 'granted' ? GRANTED : DENIED);
        box.remove();
        window.removeEventListener('resize', offset);
        root.style.setProperty('--consent-offset', '0px');
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(show, 8000);
    onScroll();
  }

  function onReady() { decorateBotLinks(); consentBanner(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
