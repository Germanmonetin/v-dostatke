/**
 * Google Ads Scripts — создаёт поисковую кампанию для v-dostatke.com.
 *
 * КАК ЗАПУСКАТЬ (Google Ads → Инструменты → Массовые действия → Скрипты → «+»):
 *  1. Вставить весь файл, нажать «Авторизовать», затем «Предварительный просмотр»
 *     или «Запустить». Смотреть «Журнал» (Logs) внизу.
 *  2. Если кампании ещё нет, первый запуск только отправит заявку на её создание
 *     (массовая загрузка выполняется отдельно, 1–3 минуты) и напишет об этом в лог.
 *     Через пару минут запустить скрипт ВТОРОЙ раз — он создаст группы, ключи,
 *     минус-слова, объявления и расширения.
 *  3. Скрипт идемпотентен: повторные запуски не плодят дубликаты.
 *  4. Кампания создаётся на ПАУЗЕ. После проверки глазами — включить вручную.
 *
 * ЧТО ПОСЛЕ ЗАПУСКА ПРОВЕРИТЬ/ДОСТАВИТЬ РУКАМИ (скрипты это не умеют):
 *  - Настройки кампании → Языки: русский. Сети: только Google Поиск, партнёры и КМС выкл.
 *  - Местоположения: вариант «Присутствие» (не «Присутствие или интерес»).
 *  - Ставки: «Максимум кликов», лимит CPC = MAX_CPC_USD (скрипт пытается, но проверить).
 *  - Изображения и логотип в ассетах.
 */

// ====================== НАСТРОЙКИ ======================
var CAMPAIGN_NAME = 'Search RU | v-dostatke';
var DAILY_BUDGET_USD = 20;
var MAX_CPC_USD = 1.5;
var FINAL_URL = 'https://v-dostatke.com';
var URL_SUFFIX = 'utm_source=google&utm_medium=cpc&utm_campaign=search_ru&utm_content={adgroupid}';
var DEFAULT_MAX_CPC = 1.2; // ставка по умолчанию для групп, если стратегия ещё ручная

// Страны, которые исключаем (ID геотаргетинга Google): Индия, Пакистан, Бангладеш,
// Нигерия, Египет, Вьетнам, Индонезия
var EXCLUDED_LOCATION_IDS = [2356, 2586, 2050, 2566, 2818, 2704, 2360];

var AD_GROUPS = [
  {
    name: 'AG1 | Запрет на деньги',
    keywords: [
      'внутренний запрет на деньги', 'блок на деньги', 'денежный блок', 'установки на бедность',
      'страх больших денег', 'почему не растёт доход', 'не могу зарабатывать больше',
      'ограничивающие убеждения про деньги', 'психология денег консультация', 'работа с денежными блоками'
    ],
    headlines: [
      ['Внутренний запрет на деньги', 'HEADLINE_1'],
      ['Найдём и снимем за 1 встречу', 'HEADLINE_2'],
      'Доход упёрся в потолок?', 'Причина — не в рынке, а внутри', 'Диагностика блоков на деньги',
      'Бесплатный разбор 15 минут', 'Работа с подсознанием онлайн', '60+ человек уже прошли',
      'Экономист и гипнотерапевт', 'Написать в WhatsApp', 'Без курсов и марафонов', 'Индивидуально, 1 на 1'
    ],
    descriptions: [
      'Вы много работаете, а доход стоит на месте. Находим внутренний запрет на деньги и снимаем его.',
      'Одна диагностическая встреча вместо месяцев курсов. Онлайн, из любой страны. Запись в WhatsApp.',
      'Без аффирмаций на листочке: доступ к подсознанию в ресурсном состоянии психики. Результат за сессию.',
      'Сначала бесплатный разговор на 15 минут — поймёте, ваш ли это случай. Без обязательств.'
    ]
  },
  {
    name: 'AG2 | Медитации и подсознание',
    keywords: [
      'медитация на деньги', 'аффирмации на деньги', 'подсознание и деньги', 'денежное мышление',
      'как убрать блоки в подсознании', 'работа с подсознанием деньги', 'ресурсное состояние'
    ],
    headlines: [
      ['Медитации не работают?', 'HEADLINE_1'],
      ['Снимем блок на деньги вживую', 'HEADLINE_2'],
      'Подсознание и деньги', 'Ресурсное состояние психики', 'Вместо 100 аффирмаций — 1 встреча',
      'Доступ к внутренней панели', 'Индивидуальная работа онлайн', 'Бесплатная консультация 15 мин',
      'Экономист и гипнотерапевт', 'Записаться в Telegram'
    ],
    descriptions: [
      'Аффирмации и медитации на деньги не сработали? Потому что блок сидит глубже — там, куда они не достают.',
      'Работа с подсознанием вживую, 1 на 1, онлайн. Находим установку, которая держит доход, и убираем её.',
      'Не курс и не запись: личная встреча с практикующим специалистом. 60+ человек уже прошли.',
      'Начните с бесплатного разговора на 15 минут — решите, подходит ли вам этот формат.'
    ]
  },
  {
    name: 'AG3 | Синдром самозванца',
    keywords: [
      'синдром самозванца', 'синдром самозванца как избавиться', 'синдром самозванца психолог',
      'синдром самозванца консультация', 'чувствую себя самозванцем', 'не заслуживаю успеха',
      'боюсь повысить цены', 'страх брать больше денег за работу'
    ],
    headlines: [
      ['Синдром самозванца', 'HEADLINE_1'],
      ['Убираем причину, не симптом', 'HEADLINE_2'],
      'Боитесь поднять цены?', '«Я не заслуживаю этих денег»', 'Разбор за одну встречу',
      'Для специалистов и бизнеса', 'Онлайн, из любой страны', 'Бесплатно 15 минут — спросить',
      'Экономист и гипнотерапевт', 'Без психологии на годы'
    ],
    descriptions: [
      'Вы компетентны, но внутри — «сейчас раскроют». Поэтому цены ниже рынка, а доход не растёт.',
      'Синдром самозванца — это установка в подсознании. Находим её за одну встречу и убираем.',
      'Индивидуально, онлайн, без курсов. Работал с 60+ клиентами: предприниматели, врачи, IT, творчество.',
      'Бесплатный разговор 15 минут: расскажете ситуацию, поймёте, чем могу помочь. Без давления.'
    ]
  }
];

var NEGATIVE_KEYWORDS = [
  'бесплатно', 'скачать', 'слушать', 'онлайн бесплатно', 'видео', 'книга', 'pdf', 'текст', 'читать',
  'youtube', 'тикток', 'tiktok', 'курс', 'курсы', 'обучение', 'школа', 'тренинг', 'марафон', 'вебинар',
  'диплом', 'сертификат', 'как стать', 'профессия', 'гадание', 'таро', 'руны', 'заговор', 'молитва',
  'ритуал', 'талисман', 'амулет', 'феншуй', 'нумерология', 'астрология', 'луна', 'карта желаний',
  'список аффирмаций', '100 аффирмаций', 'аффирмации луизы хей', 'текст медитации', 'медитация слушать',
  'работа', 'вакансии', 'зарплата', 'кредит', 'займ', 'заработок в интернете', 'инвестиции', 'крипта',
  'казино', 'ставки', 'тест', 'симптомы', 'диагноз', 'таблетки', 'лечение', 'психиатр', 'клиника',
  'депрессия', 'анализ', 'для детей', 'подросток', 'ребёнок', 'школьник'
];

var SITELINKS = [
  ['Бесплатный разбор 15 мин', FINAL_URL + '/#booking'],
  ['Как проходит встреча', FINAL_URL + '/#how'],
  ['Отзывы', FINAL_URL + '/#reviews'],
  ['Telegram-канал', 'https://t.me/Arhitector_Resursa']
];
var CALLOUTS = [
  'Онлайн из любой страны', 'Индивидуально 1 на 1', '60+ клиентов', 'Бесплатно 15 минут',
  'Без курсов и марафонов', 'Диплом гипнотерапевта', 'Экономист СПбГУЭФ', 'Запись в WhatsApp'
];
var SNIPPET_HEADER = 'Услуги';
var SNIPPET_VALUES = ['Бесплатный разговор', 'Диагностическая встреча', 'Работа с подсознанием', 'Сопровождение'];

// ====================== ЛОГИКА ======================
var report = { created: [], existed: [], errors: [], warnings: [] };

function main() {
  var campaign = findCampaign(CAMPAIGN_NAME);
  if (!campaign) {
    requestCampaignCreation();
    Logger.log('\n==> Кампания «' + CAMPAIGN_NAME + '» отправлена на создание через массовую загрузку.');
    Logger.log('==> Подождите 1–3 минуты и запустите скрипт ещё раз — он заполнит кампанию.');
    return;
  }
  report.existed.push('Кампания ' + CAMPAIGN_NAME);

  configureCampaign(campaign);
  addNegativeKeywords(campaign);
  excludeLocations(campaign);

  AD_GROUPS.forEach(function (spec) {
    try {
      var ag = ensureAdGroup(campaign, spec);
      ensureKeywords(ag, spec.keywords);
      ensureRsa(ag, spec);
    } catch (e) { report.errors.push('Группа ' + spec.name + ': ' + e); }
  });

  addExtensions(campaign);
  printReport();
}

function findCampaign(name) {
  var it = AdsApp.campaigns().withCondition('campaign.name = "' + name + '"').get();
  return it.hasNext() ? it.next() : null;
}

function requestCampaignCreation() {
  var columns = ['Campaign', 'Budget', 'Bid Strategy type', 'Campaign type', 'Campaign status'];
  var upload = AdsApp.bulkUploads().newCsvUpload(columns, { moneyInMicros: false });
  upload.forCampaignManagement();
  upload.append({
    'Campaign': CAMPAIGN_NAME,
    'Budget': DAILY_BUDGET_USD,
    'Bid Strategy type': 'cpc',
    'Campaign type': 'Search Only',
    'Campaign status': 'Paused'
  });
  upload.apply();
}

function configureCampaign(campaign) {
  try {
    if (!campaign.isPaused() && !campaign.isEnabled()) { /* removed — ничего */ }
    campaign.getBudget().setAmount(DAILY_BUDGET_USD);
  } catch (e) { report.warnings.push('Бюджет: ' + e); }
  try {
    campaign.urls().setFinalUrlSuffix(URL_SUFFIX);
  } catch (e) { report.warnings.push('URL suffix (поставьте вручную в настройках кампании): ' + e); }
  try {
    // TARGET_SPEND = «Максимум кликов»
    campaign.bidding().setStrategy('TARGET_SPEND');
  } catch (e) { report.warnings.push('Стратегия «Максимум кликов» — поставьте вручную, лимит CPC $' + MAX_CPC_USD + ': ' + e); }
  try {
    var at = campaign.adSchedules().get();
    if (!at.hasNext()) { /* круглосуточно по умолчанию */ }
  } catch (e) {}
}

function addNegativeKeywords(campaign) {
  var existing = {};
  var it = campaign.negativeKeywords().get();
  while (it.hasNext()) existing[it.next().getText()] = true;
  var added = 0;
  NEGATIVE_KEYWORDS.forEach(function (kw) {
    var text = '"' + kw + '"';
    if (existing[text]) return;
    try { campaign.createNegativeKeyword(text); added++; }
    catch (e) { report.errors.push('Минус-слово ' + kw + ': ' + e); }
  });
  report.created.push('Минус-слов добавлено: ' + added + ' (было ' + Object.keys(existing).length + ')');
}

function excludeLocations(campaign) {
  var done = {};
  try {
    var it = campaign.targeting().excludedLocations().get();
    while (it.hasNext()) done[it.next().getId()] = true;
  } catch (e) {}
  var n = 0;
  EXCLUDED_LOCATION_IDS.forEach(function (id) {
    if (done[id]) return;
    try { campaign.excludeLocation(id); n++; }
    catch (e) { report.warnings.push('Исключение страны ' + id + ': ' + e); }
  });
  report.created.push('Исключённых стран добавлено: ' + n);
}

function ensureAdGroup(campaign, spec) {
  var it = campaign.adGroups().withCondition('ad_group.name = "' + spec.name + '"').get();
  if (it.hasNext()) { report.existed.push('Группа ' + spec.name); return it.next(); }
  var op = campaign.newAdGroupBuilder().withName(spec.name).withCpc(DEFAULT_MAX_CPC).withStatus('ENABLED').build();
  if (!op.isSuccessful()) throw new Error(op.getErrors().join('; '));
  report.created.push('Группа ' + spec.name);
  return op.getResult();
}

function ensureKeywords(ag, keywords) {
  var existing = {};
  var it = ag.keywords().get();
  while (it.hasNext()) existing[it.next().getText()] = true;
  var added = 0;
  keywords.forEach(function (kw) {
    [ '"' + kw + '"', '[' + kw + ']' ].forEach(function (text) {
      if (existing[text]) return;
      var op = ag.newKeywordBuilder().withText(text).withFinalUrl(FINAL_URL).build();
      if (op.isSuccessful()) added++;
      else report.errors.push('Ключ ' + text + ': ' + op.getErrors().join('; '));
    });
  });
  report.created.push(ag.getName() + ': ключей добавлено ' + added);
}

function ensureRsa(ag, spec) {
  var ads = ag.ads().withCondition('ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD').get();
  if (ads.hasNext()) { report.existed.push(ag.getName() + ': объявление'); return; }

  var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(FINAL_URL);
  spec.headlines.forEach(function (h) {
    var text = Array.isArray(h) ? h[0] : h, pin = Array.isArray(h) ? h[1] : null;
    if (text.length > 30) { report.warnings.push(ag.getName() + ': заголовок длиннее 30 — ' + text); text = text.slice(0, 30); }
    if (pin) b.addHeadline(text, pin); else b.addHeadline(text);
  });
  spec.descriptions.forEach(function (d) {
    if (d.length > 90) { report.warnings.push(ag.getName() + ': описание длиннее 90 — ' + d); d = d.slice(0, 90); }
    b.addDescription(d);
  });
  var op = b.build();
  if (op.isSuccessful()) report.created.push(ag.getName() + ': объявление');
  else report.errors.push(ag.getName() + ' объявление: ' + op.getErrors().join('; '));
}

function addExtensions(campaign) {
  // Дополнительные ссылки
  var haveSitelinks = {};
  try { var si = campaign.extensions().sitelinks().get(); while (si.hasNext()) haveSitelinks[si.next().getLinkText()] = true; } catch (e) {}
  SITELINKS.forEach(function (s) {
    if (haveSitelinks[s[0]]) return;
    try {
      var op = AdsApp.extensions().newSitelinkBuilder().withLinkText(s[0]).withFinalUrl(s[1]).build();
      if (op.isSuccessful()) { campaign.addSitelink(op.getResult()); report.created.push('Доп. ссылка ' + s[0]); }
      else report.errors.push('Доп. ссылка ' + s[0] + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Доп. ссылка ' + s[0] + ': ' + e); }
  });

  // Уточнения
  var haveCallouts = {};
  try { var ci = campaign.extensions().callouts().get(); while (ci.hasNext()) haveCallouts[ci.next().getText()] = true; } catch (e) {}
  CALLOUTS.forEach(function (t) {
    if (haveCallouts[t]) return;
    if (t.length > 25) { report.warnings.push('Уточнение длиннее 25: ' + t); return; }
    try {
      var op = AdsApp.extensions().newCalloutBuilder().withText(t).build();
      if (op.isSuccessful()) { campaign.addCallout(op.getResult()); report.created.push('Уточнение ' + t); }
      else report.errors.push('Уточнение ' + t + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Уточнение ' + t + ': ' + e); }
  });

  // Структурированное описание
  try {
    var has = false;
    var sn = campaign.extensions().snippets().get();
    while (sn.hasNext()) { if (sn.next().getHeader() === SNIPPET_HEADER) has = true; }
    if (!has) {
      var op2 = AdsApp.extensions().newSnippetBuilder().withHeader(SNIPPET_HEADER).withValues(SNIPPET_VALUES).build();
      if (op2.isSuccessful()) { campaign.addSnippet(op2.getResult()); report.created.push('Структурированное описание «' + SNIPPET_HEADER + '»'); }
      else report.errors.push('Структ. описание: ' + op2.getErrors().join('; ') + ' — добавьте вручную');
    }
  } catch (e) { report.errors.push('Структ. описание: ' + e + ' — добавьте вручную'); }
}

function printReport() {
  Logger.log('\n========== ИТОГ ==========');
  Logger.log('СОЗДАНО:\n  ' + (report.created.join('\n  ') || '—'));
  Logger.log('УЖЕ БЫЛО:\n  ' + (report.existed.join('\n  ') || '—'));
  Logger.log('ПРЕДУПРЕЖДЕНИЯ:\n  ' + (report.warnings.join('\n  ') || '—'));
  Logger.log('ОШИБКИ:\n  ' + (report.errors.join('\n  ') || '—'));
  Logger.log('\nДальше руками: язык «Русский», сети — только Поиск, гео «Присутствие», ' +
    'лимит CPC $' + MAX_CPC_USD + ', изображения; проверить и снять кампанию с паузы.');
}
