/**
 * Google Ads Scripts v2 — наполняет кампанию «Search RU | v-dostatke» по исследованию
 * ads/ИССЛЕДОВАНИЕ_семантическое_ядро.md (6 групп, ставки, гео, безопасные тексты).
 *
 * КАК ЗАПУСКАТЬ: Google Ads → Инструменты → Массовые действия → Скрипты → открыть скрипт
 * «v-dostatke setup» → стереть всё → вставить этот файл → Сохранить → Запустить
 * (без предпросмотра) → История скриптов → журнал. Повторный запуск безопасен.
 *
 * ЧТО СКРИПТ ДЕЛАЕТ: ставит на паузу старые группы (AG1–AG3 первой версии и «Группа
 * объявлений 1»), создаёт 6 новых групп с ключами (фразовое; точное — только у горячих),
 * ставками по ключам, минус-словами, объявлениями без обещаний и с оговоркой «бесплатно
 * только 15 минут», 7 доп. ссылок с описаниями, 10 уточнений, структурированное описание,
 * список стран с корректировками ставок и исключения.
 *
 * ЧТО ОСТАЁТСЯ РУКАМИ (скрипты не умеют): верификация рекламодателя; Настройки кампании →
 * Местоположения → «Присутствие»; Сети → выключить партнёров и КМС; лимит CPC $1,5 в
 * стратегии «Максимум кликов»; AI Max выключить; снять кампанию с паузы.
 * Ремаркетинг и Customer Match не включать — чувствительная категория.
 * После 15–30 кликов в мессенджер за 30 дней → «Максимум конверсий».
 */

// ====================== НАСТРОЙКИ ======================
var CAMPAIGN_NAME = '«Search RU | v-dostatke»';
var DAILY_BUDGET_USD = 20;
var MAX_CPC_USD = 1.5;
var FINAL_URL = 'https://v-dostatke.com';
var URL_SUFFIX = 'utm_source=google&utm_medium=cpc&utm_campaign=search_ru&utm_content={adgroupid}';

var LEGACY_AD_GROUPS = ['Группа объявлений 1', 'AG1 | Запрет на деньги', 'AG2 | Медитации и подсознание', 'AG3 | Синдром самозванца'];

// Включённые страны: [criteria ID, множитель ставки]
var INCLUDED_LOCATIONS = [
  [2840, 1.20], [2276, 1.15], [2376, 1.15], [2784, 1.10], [2196, 1.10],
  [2124, 1.00], [2724, 1.00], [2620, 1.00], [2528, 1.00], [2826, 1.00], [2246, 1.00],
  [2040, 1.00], [2756, 1.00], [2250, 1.00], [2380, 1.00], [2300, 1.00], [2203, 1.00],
  [2428, 1.00], [2233, 1.00], [2440, 1.00], [2036, 1.00],
  [2616, 0.90], [2100, 0.90], [2688, 0.85], [2499, 0.80], [2792, 0.80], [2032, 0.80],
  [2398, 0.75], [2268, 0.70], [2051, 0.70], [2498, 0.70], [2031, 0.70], [2600, 0.70],
  [2076, 0.70], [2764, 0.60], [2860, 0.50], [2417, 0.50]
];
// Исключённые: Россия, Беларусь, Индия, Пакистан, Бангладеш, Нигерия, Египет, Филиппины,
// Вьетнам, Индонезия, Шри-Ланка, Непал, Кения, Гана, Ирак, Алжир, Марокко, Таджикистан
var EXCLUDED_LOCATION_IDS = [2643, 2112, 2356, 2586, 2050, 2566, 2818, 2608, 2704, 2360, 2144, 2524, 2404, 2288, 2368, 2012, 2504, 2762];

// Формат ключа: 'фраза' — только фразовое; '+фраза' — фразовое и точное;
// 'фраза|0.8' — множитель ставки от cpc группы.
var AD_GROUPS = [
  {
    name: 'AG1 | Запрет на деньги', cpc: 1.2,
    keywords: [
      '+внутренний запрет на деньги', 'запрет на деньги', 'денежные блоки как убрать',
      'денежный блок как снять', 'блок на деньги как убрать', '+проработка денежных блоков',
      '+денежные блоки психолог', 'работа с денежными установками', 'ограничивающие убеждения о деньгах',
      'установки бедности как избавиться', 'страх больших денег', 'страх бедности как избавиться',
      'не могу зарабатывать больше психология', 'финансовый потолок психология', 'самосаботаж деньги'
    ],
    negatives: ['тест', 'хаусел', 'книга'],
    headlines: [
      ['Внутренний запрет на деньги', 'HEADLINE_1'],
      'Доход есть, а роста нет', 'Причина не в рынке, а внутри', 'Денежные блоки: где причина',
      'Убеждения о деньгах из детства', 'Диагностическая встреча 1–2 ч', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Работа с подсознанием онлайн', 'Экономист и гипнотерапевт',
      'Спокойно, без ритуалов', 'Не курс и не марафон', '60+ клиентов прошли работу',
      'v-dostatke.com', 'Написать в WhatsApp'
    ],
    descriptions: [
      'Внутренний запрет на деньги — старое решение. На диагностической встрече видим, где оно.',
      '15 минут бесплатно — понять, ваш ли это случай. Дальше платная диагностическая встреча.',
      'Для специалистов и предпринимателей: доход есть, роста нет. Онлайн, в вашем часовом поясе.',
      'Экономист и гипнотерапевт по диплому. Работа с подсознанием, не аффирмации. 60+ клиентов.'
    ]
  },
  {
    name: 'AG2 | Синдром самозванца', cpc: 1.0,
    keywords: [
      '+синдром самозванца психолог', '+синдром самозванца психолог онлайн', '+синдром самозванца консультация',
      'синдром самозванца терапия', 'синдром самозванца как избавиться|0.8', 'синдром самозванца как справиться|0.8',
      'синдром самозванца у предпринимателей', 'синдром самозванца и деньги',
      'синдром самозванца не могу поднять цены', 'чувствую себя самозванцем', '[синдром самозванца]|0.5'
    ],
    negatives: ['тест', 'клэнс', 'в it', 'студент', 'книга', 'википедия', 'реферат'],
    headlines: [
      ['Синдром самозванца', 'HEADLINE_1'],
      'Когда кажется, что раскроют', 'Самозванец и цена за работу', 'Компетентность есть, веры нет',
      'Причина — в подсознании', 'Для специалистов и бизнеса', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Работа с подсознанием онлайн', 'Экономист и гипнотерапевт',
      'Индивидуально, онлайн', 'Не курс и не марафон', 'v-dostatke.com', 'Записаться в Telegram'
    ],
    descriptions: [
      'Синдром самозванца держит цены ниже рынка. Ищем, откуда он, а не учим верить в себя.',
      '15 минут бесплатно: расскажете, что происходит, узнаете, подходит ли формат. Далее платно.',
      'Индивидуальная работа с подсознанием онлайн. Без курсов и марафонов. Есть дипломы.',
      'Диагностическая встреча 1–2 часа: видим, что стоит за ощущением «я недостаточно». Онлайн.'
    ]
  },
  {
    name: 'AG3 | Цена за свою работу', cpc: 1.3,
    keywords: [
      '+боюсь назвать цену', 'страх назвать цену', '+стыдно брать деньги за работу', 'стыдно просить деньги',
      '+страх поднять цены', 'как поднять цены не потерять клиентов психология',
      'не могу назвать цену за свою работу', '+боюсь брать деньги за работу',
      'занижаю стоимость своих услуг', 'стыдно продавать', '+страх больших денег психолог'
    ],
    negatives: [],
    headlines: [
      ['Страшно назвать цену?', 'HEADLINE_1'],
      'Стыдно брать деньги за работу', 'Цены ниже рынка — почему', 'Внутренний запрет на деньги',
      'Страх поднять цены клиентам', 'Причина глубже, чем навыки', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Работа с подсознанием онлайн', 'Экономист и гипнотерапевт',
      'Для фриланса и практиков', 'Не курс и не марафон', 'v-dostatke.com', 'Написать в WhatsApp'
    ],
    descriptions: [
      'Если цену занижают годами, дело не в навыках. Ищем внутренний запрет на деньги и причину.',
      '15 минут бесплатно — понять, ваш ли это случай. Дальше платная диагностическая встреча.',
      'Для специалистов, практиков и фрилансеров. Индивидуально, онлайн. Без курсов и марафонов.',
      'Экономист и гипнотерапевт по диплому. Спокойная работа с подсознанием, без давления.'
    ]
  },
  {
    name: 'AG4 | Психолог по деньгам', cpc: 1.3,
    keywords: [
      '+психолог по деньгам', '+психолог по деньгам онлайн', 'психолог по финансам', '+финансовый психолог',
      '+финансовый психолог онлайн', '+финансовый психолог консультация', 'психолог денежное мышление',
      'психолог для предпринимателей онлайн', 'бизнес психолог онлайн|0.8',
      'русскоязычный психолог онлайн', 'психолог онлайн на русском', 'психолог низкая самооценка деньги'
    ],
    negatives: ['цена', 'стоимость', 'бесплатный', 'ясно', 'zigmund', 'alter', 'b17', 'профи'],
    headlines: [
      ['Деньги: психологическая работа', 'HEADLINE_1'],
      'Внутренний запрет на деньги', 'Экономист и гипнотерапевт', 'Работа с подсознанием онлайн',
      'Русскоязычный, из любой страны', 'Для специалистов и бизнеса', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Диагностическая встреча 1–2 ч', 'Индивидуально, онлайн',
      'Не курс и не марафон', '60+ клиентов прошли работу', 'v-dostatke.com', 'Записаться в Telegram'
    ],
    descriptions: [
      'Психологическая работа с деньгами: внутренний запрет, страх цены, доход без роста. Онлайн.',
      '15 минут бесплатно — понять, ваш ли это случай. Дальше платная диагностическая встреча.',
      'Экономист (СПбГУЭФ) и гипнотерапевт по диплому. Работа с подсознанием, без эзотерики.',
      'Для тех, у кого доход есть, но упёрся. Онлайн, в вашем часовом поясе. Запись в Telegram.'
    ]
  },
  {
    name: 'AG5 | Подсознание онлайн', cpc: 1.0,
    keywords: [
      'работа с подсознанием|0.8', '+работа с подсознанием психолог', '+работа с подсознанием онлайн',
      '+работа с подсознанием деньги', 'подсознание и деньги|0.7', '+гипнотерапевт онлайн',
      '+гипнотерапевт консультация', 'гипнотерапия онлайн', 'гипнотерапия деньги',
      'эриксоновский гипноз онлайн сеанс', 'регрессивный гипноз онлайн|0.8', 'гипноз от неуверенности в себе'
    ],
    negatives: ['обучение', 'курсы', 'книга', 'слушать', 'для сна', 'похудение', 'курение', 'алкоголь', 'шоу', 'уличный', 'цыганский', 'самогипноз', 'прошлые жизни'],
    headlines: [
      ['Работа с подсознанием онлайн', 'HEADLINE_1'],
      'Дипломированный гипнотерапевт', 'Ресурсное состояние психики', 'Внутренний запрет на деньги',
      'Доступ к панели управления', 'Вы в сознании, всё помните', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Экономист и гипнотерапевт', 'Индивидуально, онлайн',
      'Без эзотерики и ритуалов', 'Есть противопоказания', 'v-dostatke.com', 'Написать в WhatsApp'
    ],
    descriptions: [
      'Работа с подсознанием в ресурсном состоянии психики: вы в сознании и всё помните.',
      '15 минут бесплатно — понять, ваш ли это случай. Дальше платная диагностическая встреча.',
      'Гипнотерапевт по диплому (ИПО, ИМАТОН, 2025), экономист. Тема — запрет на деньги.',
      'Индивидуально, онлайн, из любой страны. Без ритуалов и обещаний. Есть противопоказания.'
    ]
  },
  {
    name: 'AG6 | Медитации не сработали', cpc: 0.6,
    keywords: [
      '+аффирмации на деньги не работают', 'почему аффирмации не работают', 'медитация на деньги не помогает',
      'почему медитации на деньги не работают', 'денежное мышление как развить',
      'мышление бедности как избавиться', 'денежные убеждения|0.7', 'установки на деньги|0.7'
    ],
    negatives: ['слушать', 'скачать', 'аудио', 'текст', 'список'],
    headlines: [
      ['Медитации не помогли?', 'HEADLINE_1'],
      'Аффирмации не работают?', 'Денежное мышление вживую', 'Внутренний запрет на деньги',
      'Не аудио, а разговор', 'Причина глубже аффирмаций', 'Знакомство 15 минут бесплатно',
      'Дальше — платная диагностика', 'Работа с подсознанием онлайн', 'Экономист и гипнотерапевт',
      'Без ритуалов и эзотерики', 'Не курс и не марафон', 'v-dostatke.com', 'Записаться в Telegram'
    ],
    descriptions: [
      'Аффирмации спорят со старыми убеждениями и проигрывают. Ищем внутренний запрет на деньги.',
      '15 минут бесплатно — понять, ваш ли это случай. Дальше платная диагностическая встреча.',
      'Живая индивидуальная работа с подсознанием вместо записей. Онлайн. Есть дипломы.',
      'Для тех, кто пробовал медитации и практики, а доход стоит. Без ритуалов и обещаний.'
    ]
  }
];

var NEGATIVE_KEYWORDS = [
  // халява / контент
  'бесплатно', 'бесплатный', 'скачать', 'слушать', 'смотреть', 'видео', 'youtube', 'ютуб', 'рутуб', 'tiktok', 'тикток',
  'подкаст', 'аудио', 'mp3', 'книга', 'книги', 'читать', 'pdf', 'текст', 'реферат', 'курсовая', 'презентация', 'доклад',
  'википедия', 'форум', 'тест', 'тесты', 'пройти тест', 'упражнения', 'самостоятельно', 'в домашних условиях', 'своими силами', 'чек-лист',
  // обучение / профессия
  'курс', 'курсы', 'обучение', 'школа', 'вебинар', 'марафон', 'челлендж', 'интенсив', 'тренинг', 'сертификат', 'диплом',
  'профессия', 'зарплата', 'вакансии', 'вакансия', 'найти работу', 'работа психологом', 'удалённая работа', 'подработка',
  'резюме', 'как стать', 'институт', 'иматон',
  // чужие ниши гипноза
  'похудение', 'курение', 'бросить курить', 'алкоголь', 'алкоголизм', 'наркомания', 'игромания', 'сон', 'бессонница', 'боль',
  'аллергия', 'заикание', 'роды', 'шоу', 'эстрадный', 'уличный', 'цыганский', 'самогипноз', 'прошлые жизни',
  // эзотерика
  'гадание', 'таро', 'руны', 'заговор', 'молитва', 'ритуал', 'обряд', 'мантра', 'талисман', 'амулет', 'феншуй', 'фэншуй',
  'нумерология', 'астрология', 'гороскоп', 'луна', 'полнолуние', 'карта желаний', 'симорон', '528', 'частота', 'вибрации',
  'карма', 'порча', 'приворот', 'кошелёк', 'денежное дерево', 'матрица судьбы', 'трансерфинг', 'зеланд', 'синельников',
  'луизы хей', 'список аффирмаций', '100 аффирмаций', 'текст медитации', 'медитация слушать',
  // медицина
  'симптомы', 'диагноз', 'таблетки', 'лечение', 'психиатр', 'клиника', 'депрессия', 'панические атаки', 'невроз', 'психотерапевт врач',
  // не наша аудитория
  'для детей', 'ребёнок', 'ребенка', 'подросток', 'школьник', 'студент', 'кредит', 'займ', 'долги взыскание', 'банк', 'биржа',
  'инвестиции', 'трейдинг', 'крипта', 'казино', 'ставки', 'лотерея', 'выиграть', 'заработок в интернете',
  // бренды-перехватчики
  'хаусел', 'ясно', 'zigmund', 'alter', 'b17', 'профи', 'клэнс'
];
// Минус-слова первой версии, которые надо убрать (блокировали свои же ключи)
var NEGATIVES_TO_REMOVE = ['работа', 'анализ', 'бесплатно'];
// ↑ «бесплатно» остаётся в новом списке как фразовое, но старое было без кавычек-контроля — пересоздаём

var SITELINKS = [
  ['15 минут бесплатно', FINAL_URL + '/#booking', 'Понять, ваш ли это случай', 'Дальше — платная диагностика'],
  ['Как проходит работа', FINAL_URL + '/#how', 'Диагностическая встреча 1–2 часа', 'Затем индивидуальная работа'],
  ['О специалисте', FINAL_URL + '/#about', 'Экономист и гипнотерапевт', 'Дипломы ИПО и ИМАТОН, 2025'],
  ['Видеоотзывы', FINAL_URL + '/#reviews', '60+ клиентов прошли работу', 'Результаты индивидуальны'],
  ['Вопросы и ответы', FINAL_URL + '/#faq', 'Стоимость, формат, контроль', 'Без скрытых платежей'],
  ['Противопоказания', FINAL_URL + '/protivopokazaniya.html', 'Кому формат не подходит', 'Честно и заранее'],
  ['Telegram-канал', 'https://t.me/Arhitector_Resursa', 'Архитектор ресурса', 'Тексты о деньгах и психике']
];
var CALLOUTS = [
  'Бесплатно только 15 минут', 'Диагностика — платно', 'Онлайн из любой страны', 'Индивидуально 1 на 1', '60+ клиентов',
  'Без курсов и марафонов', 'Диплом гипнотерапевта', 'Экономист СПбГУЭФ', 'Запись в WhatsApp', 'Есть противопоказания'
];
var OLD_CALLOUTS = ['Бесплатно 15 минут'];
var OLD_SITELINKS = ['Бесплатный разбор 15 мин', 'Как проходит встреча', 'Отзывы'];
var SNIPPET_HEADER = 'Услуги';
var SNIPPET_VALUES = ['Знакомство 15 минут', 'Диагностическая встреча', 'Работа с подсознанием', 'Сопровождение'];

// ====================== ЛОГИКА ======================
var report = { created: [], existed: [], errors: [], warnings: [] };

function main() {
  var campaign = findCampaign(CAMPAIGN_NAME);
  if (!campaign) { Logger.log('==> Кампания не найдена. Проверьте имя.'); return; }
  report.existed.push('Кампания ' + campaign.getName());

  configureCampaign(campaign);
  pauseLegacyGroups(campaign);
  refreshNegativeKeywords(campaign);
  setLocations(campaign);

  AD_GROUPS.forEach(function (spec) {
    try {
      var ag = ensureAdGroup(campaign, spec);
      ensureKeywords(ag, spec);
      ensureGroupNegatives(ag, spec.negatives);
      ensureRsa(ag, spec);
    } catch (e) { report.errors.push('Группа ' + spec.name + ': ' + e); }
  });

  refreshExtensions(campaign);
  printReport();
}

function norm(s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); }

function findCampaign(name) {
  var it = AdsApp.campaigns().get();
  var names = [], found = null;
  while (it.hasNext()) {
    var c = it.next(); names.push(c.getName());
    if (norm(c.getName()) === norm(name) || norm(c.getName()) === norm(name.replace(/[«»]/g, ''))) found = c;
  }
  Logger.log('Кампании в аккаунте: ' + names.join(' || '));
  return found;
}

function configureCampaign(campaign) {
  try { campaign.getBudget().setAmount(DAILY_BUDGET_USD); } catch (e) { report.warnings.push('Бюджет: ' + e); }
  try { campaign.urls().setFinalUrlSuffix(URL_SUFFIX); } catch (e) { report.warnings.push('URL suffix: ' + e); }
  try { campaign.bidding().setStrategy('TARGET_SPEND'); } catch (e) { report.warnings.push('Стратегия (поставьте «Максимум кликов», лимит $' + MAX_CPC_USD + ' руками): ' + e); }
}

function pauseLegacyGroups(campaign) {
  var it = campaign.adGroups().get();
  while (it.hasNext()) {
    var g = it.next();
    for (var i = 0; i < LEGACY_AD_GROUPS.length; i++) {
      if (norm(g.getName()) === norm(LEGACY_AD_GROUPS[i]) && g.isEnabled()) {
        g.pause(); report.created.push('Старая группа на паузе: ' + g.getName());
      }
    }
  }
}

function refreshNegativeKeywords(campaign) {
  var existing = {};
  var it = campaign.negativeKeywords().get();
  var removed = 0;
  while (it.hasNext()) {
    var nk = it.next(); var t = nk.getText().replace(/^"|"$/g, '');
    if (NEGATIVES_TO_REMOVE.indexOf(t) !== -1) { nk.remove(); removed++; continue; }
    existing[t] = true;
  }
  var added = 0;
  NEGATIVE_KEYWORDS.forEach(function (kw) {
    if (existing[kw]) return;
    try { campaign.createNegativeKeyword('"' + kw + '"'); added++; }
    catch (e) { report.errors.push('Минус-слово ' + kw + ': ' + e); }
  });
  report.created.push('Минус-слова кампании: добавлено ' + added + ', удалено ' + removed);
}

function setLocations(campaign) {
  var targeted = {}, excluded = {};
  try { var ti = campaign.targeting().targetedLocations().get(); while (ti.hasNext()) targeted[ti.next().getId()] = true; } catch (e) {}
  try { var ei = campaign.targeting().excludedLocations().get(); while (ei.hasNext()) excluded[ei.next().getId()] = true; } catch (e) {}
  var inc = 0, exc = 0;
  INCLUDED_LOCATIONS.forEach(function (p) {
    if (targeted[p[0]]) return;
    try { campaign.addLocation(p[0], p[1]); inc++; } catch (e) { report.warnings.push('Страна ' + p[0] + ': ' + e); }
  });
  EXCLUDED_LOCATION_IDS.forEach(function (id) {
    if (excluded[id]) return;
    try { campaign.excludeLocation(id); exc++; } catch (e) { report.warnings.push('Исключение ' + id + ': ' + e); }
  });
  report.created.push('Стран включено: ' + inc + ', исключено: ' + exc + ' (было ' + Object.keys(targeted).length + '/' + Object.keys(excluded).length + ')');
  report.warnings.push('Местоположения: руками выставить «Присутствие» в расширенных настройках.');
}

function ensureAdGroup(campaign, spec) {
  var it = campaign.adGroups().get();
  while (it.hasNext()) {
    var g = it.next();
    if (norm(g.getName()) === norm(spec.name)) {
      report.existed.push('Группа ' + spec.name);
      try { g.bidding().setCpc(spec.cpc); } catch (e) {}
      if (!g.isEnabled()) g.enable();
      return g;
    }
  }
  var op = campaign.newAdGroupBuilder().withName(spec.name).withCpc(spec.cpc).withStatus('ENABLED').build();
  if (!op.isSuccessful()) throw new Error(op.getErrors().join('; '));
  report.created.push('Группа ' + spec.name + ' (CPC $' + spec.cpc + ')');
  return op.getResult();
}

function parseKeyword(raw) {
  var exact = false, mult = 1, text = raw;
  var m = text.match(/^(.*)\|([0-9.]+)$/);
  if (m) { text = m[1]; mult = parseFloat(m[2]); }
  if (text.charAt(0) === '+') { exact = true; text = text.slice(1); }
  var variants = [];
  if (text.charAt(0) === '[') variants.push(text);            // только точное
  else { variants.push('"' + text + '"'); if (exact) variants.push('[' + text + ']'); }
  return { variants: variants, mult: mult };
}

function ensureKeywords(ag, spec) {
  var existing = {};
  var it = ag.keywords().get();
  while (it.hasNext()) existing[it.next().getText()] = true;
  var added = 0;
  spec.keywords.forEach(function (raw) {
    var k = parseKeyword(raw);
    k.variants.forEach(function (text) {
      if (existing[text]) return;
      var b = ag.newKeywordBuilder().withText(text).withFinalUrl(FINAL_URL);
      if (k.mult !== 1) b = b.withCpc(Math.round(spec.cpc * k.mult * 100) / 100);
      var op = b.build();
      if (op.isSuccessful()) added++;
      else report.errors.push('Ключ ' + text + ': ' + op.getErrors().join('; '));
    });
  });
  report.created.push(ag.getName() + ': ключей добавлено ' + added);
}

function ensureGroupNegatives(ag, negatives) {
  if (!negatives || !negatives.length) return;
  var existing = {};
  var it = ag.negativeKeywords().get();
  while (it.hasNext()) existing[it.next().getText().replace(/^"|"$/g, '')] = true;
  var added = 0;
  negatives.forEach(function (kw) {
    if (existing[kw]) return;
    try { ag.createNegativeKeyword('"' + kw + '"'); added++; } catch (e) { report.errors.push('Минус группы ' + kw + ': ' + e); }
  });
  if (added) report.created.push(ag.getName() + ': минус-слов группы ' + added);
}

function ensureRsa(ag, spec) {
  var ads = ag.ads().get();
  while (ads.hasNext()) {
    var ad = ads.next();
    try { if (ad.getType() === 'RESPONSIVE_SEARCH_AD' && ad.isEnabled()) { report.existed.push(ag.getName() + ': объявление'); return; } } catch (e) {}
  }
  var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(FINAL_URL);
  spec.headlines.forEach(function (h) {
    var text = Array.isArray(h) ? h[0] : h, pin = Array.isArray(h) ? h[1] : null;
    if (text.length > 30) { report.warnings.push(ag.getName() + ': заголовок >30 — ' + text); text = text.slice(0, 30); }
    if (pin) b.addHeadline(text, pin); else b.addHeadline(text);
  });
  spec.descriptions.forEach(function (d) {
    if (d.length > 90) { report.warnings.push(ag.getName() + ': описание >90 — ' + d); d = d.slice(0, 90); }
    b.addDescription(d);
  });
  var op = b.build();
  if (op.isSuccessful()) report.created.push(ag.getName() + ': объявление');
  else report.errors.push(ag.getName() + ' объявление: ' + op.getErrors().join('; '));
}

function refreshExtensions(campaign) {
  // доп. ссылки: убрать старые, добавить новые с описаниями
  var have = {};
  try {
    var si = campaign.extensions().sitelinks().get();
    while (si.hasNext()) {
      var s = si.next();
      if (OLD_SITELINKS.indexOf(s.getLinkText()) !== -1) { try { campaign.removeSitelink(s); report.created.push('Удалена ссылка ' + s.getLinkText()); } catch (e) {} }
      else have[s.getLinkText()] = true;
    }
  } catch (e) {}
  SITELINKS.forEach(function (s) {
    if (have[s[0]]) return;
    try {
      var op = AdsApp.extensions().newSitelinkBuilder().withLinkText(s[0]).withFinalUrl(s[1]).withDescription1(s[2]).withDescription2(s[3]).build();
      if (op.isSuccessful()) { campaign.addSitelink(op.getResult()); report.created.push('Доп. ссылка ' + s[0]); }
      else report.errors.push('Доп. ссылка ' + s[0] + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Доп. ссылка ' + s[0] + ': ' + e); }
  });

  // уточнения
  var haveC = {};
  try {
    var ci = campaign.extensions().callouts().get();
    while (ci.hasNext()) {
      var c = ci.next();
      if (OLD_CALLOUTS.indexOf(c.getText()) !== -1) { try { campaign.removeCallout(c); report.created.push('Удалено уточнение ' + c.getText()); } catch (e) {} }
      else haveC[c.getText()] = true;
    }
  } catch (e) {}
  CALLOUTS.forEach(function (t) {
    if (haveC[t]) return;
    if (t.length > 25) { report.warnings.push('Уточнение >25: ' + t); return; }
    try {
      var op = AdsApp.extensions().newCalloutBuilder().withText(t).build();
      if (op.isSuccessful()) { campaign.addCallout(op.getResult()); report.created.push('Уточнение ' + t); }
      else report.errors.push('Уточнение ' + t + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Уточнение ' + t + ': ' + e); }
  });

  // структурированное описание: старое «Услуги» с «Бесплатный разговор» убрать, поставить новое
  try {
    var sn = campaign.extensions().snippets().get();
    var ok = false;
    while (sn.hasNext()) {
      var sp = sn.next();
      if (sp.getHeader() !== SNIPPET_HEADER) continue;
      var vals = sp.getValues().join('|');
      if (vals === SNIPPET_VALUES.join('|')) ok = true;
      else { try { campaign.removeSnippet(sp); report.created.push('Удалено старое структ. описание'); } catch (e) {} }
    }
    if (!ok) {
      var op2 = AdsApp.extensions().newSnippetBuilder().withHeader(SNIPPET_HEADER).withValues(SNIPPET_VALUES).build();
      if (op2.isSuccessful()) { campaign.addSnippet(op2.getResult()); report.created.push('Структурированное описание «' + SNIPPET_HEADER + '»'); }
      else report.errors.push('Структ. описание: ' + op2.getErrors().join('; '));
    }
  } catch (e) { report.errors.push('Структ. описание: ' + e); }
}

function printReport() {
  Logger.log('========== ИТОГ ==========');
  Logger.log('СОЗДАНО:\n  ' + (report.created.join('\n  ') || '—'));
  Logger.log('УЖЕ БЫЛО:\n  ' + (report.existed.join('\n  ') || '—'));
  Logger.log('ПРЕДУПРЕЖДЕНИЯ:\n  ' + (report.warnings.join('\n  ') || '—'));
  Logger.log('ОШИБКИ:\n  ' + (report.errors.join('\n  ') || '—'));
  Logger.log('Руками: верификация рекламодателя; «Присутствие»; сети — только Поиск; лимит CPC $' + MAX_CPC_USD + '; AI Max выкл; удалить старые группы; снять с паузы.');
}
