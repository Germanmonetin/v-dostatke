/**
 * Google Ads Scripts v5 — девять ситуаций, у каждого объявления своя метка.
 * v5.1: вместо «экономист» — «Архитектор ресурса».
 * v5.2: повторный запуск не добавляет уже существующие ключевые слова.
 * v5.3: ключи, которых нет в списке группы, ставятся на паузу (дубли между группами).
 * v5.4: S1 — вместо редких длинных фраз короткие ядра (по отчёту 1–7 ноября).
 *
 * Что нового против v4:
 *  - Новые группы: S7 «Внутренние запреты» (снятие запретов, денежные блоки),
 *    S8 «Внутренний ресурс» (работа с ресурсом, ресурсный консалтинг, подсознание),
 *    S9 «Психология денег» (тех, кто ищет специалиста по деньгам).
 *  - В каждой группе два объявления: «боль» (узнавание → причина → 15 минут) и
 *    «решение» (узнавание → чем работаем → доверие). Видно, что лучше приводит людей.
 *  - На позиции 2 в «решении» чередуются «Снятие внутренних запретов», «Ресурсный консалтинг онлайн»,
 *    «Работа с внутренним ресурсом» — в отчёте «Ресурсы» видно, какое название цепляет.
 *  - Метка объявления (s1_bol, s1_resh…) уходит в ссылку (utm_content) и в Telegram-бот (start=ads_s1_bol):
 *    по каждой заявке видно, какое объявление её привело.
 *  - Все заголовки и описания закреплены, Google не склеивает случайные фразы.
 *
 * Запуск: Инструменты → Массовые действия → Скрипты → «v-dostatke setup» → стереть всё →
 * вставить этот файл → Сохранить → Предварительный просмотр → Запустить.
 * Повторный запуск безопасен. Старые группы и старые объявления ставятся на ПАУЗУ, не удаляются.
 */

var CAMPAIGN_NAME = 'Search RU | v-dostatke';
var FINAL_URL = 'https://v-dostatke.com';
var KEEP_GROUP_PREFIXES = ['S1 ', 'S2 ', 'S3 ', 'S4 ', 'S5 ', 'S6 ', 'S7 ', 'S8 ', 'S9 ']; // остальные группы — на паузу
// Общая часть меток в ссылке. utm_content у каждого объявления свой (code), у быстрых ссылок — sitelink.
var UTM_BASE = 'utm_source=google&utm_medium=cpc&utm_campaign=search_ru&utm_term={keyword}';

// 'фраза' — фразовое; '+фраза' — фразовое и точное; '|0.8' — множитель ставки
var AD_GROUPS = [
  {
    name: 'S1 | Обесценивание', cpc: 1.3,
    keywords: [
      // v5.4: длинные редкие фразы убраны (за 1–7 ноября «редко показывается»), оставлены допущенные
      // и добавлены короткие ядра во фразовом соответствии — они ловят и длинные варианты запросов.
      'как научиться ценить себя', '+как перестать обесценивать себя', 'как перестать сомневаться в себе',
      'ценить себя', 'обесценивание себя', 'обесцениваю себя', 'сомнения в себе', 'самоценность',
      'низкая самооценка что делать', 'неуверенность в себе как избавиться|0.8',
      'стыдно брать деньги', 'не могу брать деньги', 'деньги и самооценка',
      'боюсь продавать', 'страх продаж|0.8', 'как поднять цены на свои услуги', 'как повысить цены на услуги'
    ],
    negatives: ['скрипт', 'отработка возражений', 'менеджер по продажам', 'отдел продаж', 'холодные звонки', 'прайс', 'шаблон', 'образец письма', 'договор', 'счёт', 'себестоимость', 'наценка', 'маркетплейс', 'вайлдберриз', 'озон', 'авито', 'самооценка тест',
      'тест', 'для детей', 'ребенок', 'ребёнок', 'подросток', 'школьник', 'в отношениях', 'муж', 'жена', 'парень', 'девушка', 'книга', 'цитаты', 'статус', 'стихи', 'картинки', 'тренинг', 'курс', 'курсы', 'менеджер', 'магазин', 'товар']
  },
  {
    name: 'S2 | Доход упёрся', cpc: 1.2,
    keywords: [
      '+почему не растёт доход', '+почему доход стоит на месте', 'доход не растёт', 'годами стою на месте в доходе',
      'застрял в доходе', 'застрял на одном уровне дохода', 'финансовый потолок|0.8', 'потолок дохода|0.8',
      'как пробить финансовый потолок', '+хочу зарабатывать больше но не получается', '+много работаю а доход не растёт',
      'работаю много а денег нет', '+почему я не могу заработать больше', 'почему не получается зарабатывать',
      'боюсь зарабатывать больше', 'страх больших денег', 'деньги уходят сквозь пальцы психология',
      'деньги не задерживаются психология', 'как выйти на новый уровень дохода|0.8'
    ],
    negatives: ['в интернете', 'без вложений', 'на дому', 'вакансии', 'подработка', 'школьнику', 'студенту', 'пенсионеру', 'на телефоне', 'крипта', 'инвестиции', 'акции', 'ставки', 'казино', 'кредит', 'ипотека', 'налог', 'калькулятор', 'марафон желаний', 'аффирмации']
  },
  {
    name: 'S3 | Делаю всё кроме нужного', cpc: 1.0,
    keywords: [
      '+почему я откладываю важные дела', '+почему я всё откладываю', 'откладываю важное делаю ерунду',
      '+делаю всё кроме главного', 'почему я не делаю то что нужно', 'не могу заставить себя начать',
      'не могу начать важное дело', 'откладываю своё дело годами', 'откладываю жизнь на потом',
      'прокрастинация это не лень', 'прокрастинация у взрослых как избавиться|0.8', 'прокрастинация у предпринимателя',
      'прокрастинация фрилансера', 'хроническая прокрастинация что делать', 'прокрастинация психолог',
      '+самосаботаж', '+почему я саботирую себя', 'саботирую себя что делать', 'самосаботаж психология причины',
      'как перестать откладывать дела на потом|0.7', 'страх успеха', 'почему я сам разрушаю свой успех'
    ],
    negatives: ['студент', 'учёба', 'экзамен', 'сессия', 'диплом', 'курсовая', 'домашнее задание', 'школьник', 'подросток', 'определение', 'википедия', 'реферат', 'приложение', 'таймер', 'помодоро', 'трекер', 'тайм-менеджмент', 'мем', 'цитаты']
  },
  {
    name: 'S4 | Самозванец', cpc: 1.0,
    keywords: [
      'синдром самозванца как избавиться|0.8', 'синдром самозванца как бороться|0.8', '+синдром самозванца психолог',
      '+синдром самозванца у предпринимателя', 'синдром самозванца у специалиста', 'синдром самозванки',
      '+синдром самозванца и деньги', 'чувствую себя обманщиком на работе', '+боюсь что меня раскроют',
      'все поймут что я ничего не знаю', 'я недостаточно компетентен', '+не верю в себя что делать',
      'не верю в себя и свои силы', 'как поверить в себя и начать своё дело', 'боюсь начать своё дело',
      'боюсь начать новое', 'страх успеха как избавиться', 'боюсь стать заметным', 'страх стать заметной'
    ],
    negatives: ['определение', 'тест', 'книга', 'купить', 'фильм', 'мем', 'imposter', 'hr', 'тимлид', 'джун', 'junior', 'мюнхгаузена', 'симптомы болезни', 'подросток', 'ребёнок', 'муж', 'парень', 'отношения', 'спорт']
  },
  {
    name: 'S5 | Устал держать лицо', cpc: 0.9,
    keywords: [
      '+выгорание предпринимателя', 'выгорание у предпринимателей что делать', 'выгорание владельца бизнеса',
      'выгорание самозанятого', 'выгорание фрилансера', '+устал от своего бизнеса', 'устал от бизнеса хочу всё бросить',
      '+устал от работы но не могу остановиться', '+не могу остановиться работать', 'не могу перестать работать',
      '+работаю на износ', 'работаю на износ что делать', 'работаю без выходных уже год', 'трудоголизм как избавиться',
      '+не умею отдыхать', 'не умею отдыхать что делать', 'не могу расслабиться даже в отпуске',
      '+чувство вины когда отдыхаю', '+чувство вины за отдых', 'стыдно отдыхать', 'как отдыхать без чувства вины'
    ],
    negatives: ['учитель', 'врач', 'медсестра', 'педагог', 'воспитатель', 'соцработник', 'сотрудников', 'hr', 'тест маслач', 'опросник', 'бойко', 'диагноз', 'больничный', 'трудовой кодекс', 'увольнение', 'мама', 'декрет', 'материнское', 'перетренированность', 'лампочка', 'экран']
  },
  {
    name: 'S6 | Чужое мнение', cpc: 1.0,
    keywords: [
      '+зависимость от чужого мнения как избавиться', '+зависимость от чужого мнения', 'как перестать зависеть от мнения окружающих',
      'как перестать зависеть от чужого мнения', '+боюсь осуждения', 'страх осуждения психология', 'что обо мне подумают',
      'боюсь что подумают люди', 'не могу принять решение без одобрения', 'живу чужими ожиданиями',
      'боюсь разочаровать родителей', 'боюсь критики', 'боюсь критики что делать', '+боюсь отказать',
      'не умею говорить нет', 'не умею отказывать', 'не могу отказать клиенту', 'боюсь выкладывать видео с собой',
      'стесняюсь вести блог', 'боюсь публичности', 'страх быть на виду', 'боюсь заявить о себе',
      'стесняюсь продавать свои услуги', 'боюсь показывать себя'
    ],
    negatives: ['подросток', 'ребёнок', 'дети', 'школа', 'муж', 'жена', 'парень', 'девушка', 'отношения', 'свекровь', 'тёща', 'тест', 'книга', 'цитаты', 'мем']
  },
  {
    name: 'S7 | Внутренние запреты', cpc: 1.2,
    keywords: [
      '+внутренний запрет на деньги', '+внутренние запреты', '+снятие внутренних запретов', 'как снять внутренние запреты',
      'как убрать внутренние запреты', 'внутренние запреты психология', 'запрет на успех психология', 'запрет на большие деньги',
      'внутренний запрет на богатство', 'денежные блоки как убрать', '+денежный блок как снять', 'снятие денежных блоков',
      'работа с денежными блоками', 'ограничивающие убеждения о деньгах', 'установки бедности как убрать',
      'родительские установки о деньгах'
    ],
    negatives: ['тест', 'книга', 'медитация', 'аффирмации', 'слушать', 'саблиминал', 'руны', 'став', 'чистка', 'обряд', 'родовые', 'род', 'энергия', 'курс', 'курсы', 'обучение', 'марафон', 'на ребёнка', 'для детей']
  },
  {
    name: 'S8 | Внутренний ресурс', cpc: 0.8,
    keywords: [
      '+работа с внутренним ресурсом', 'как найти внутренний ресурс', 'внутренний ресурс психология', 'где взять внутренний ресурс',
      'нет внутреннего ресурса', 'нет ресурса на дела', '+ресурсный консалтинг', 'ресурсный консультант',
      '+работа с подсознанием онлайн', 'работа с подсознанием деньги', 'работа с подсознанием психолог',
      'подсознание и деньги|0.7'
    ],
    negatives: ['ресурсный класс', 'ресурсный центр', 'ресурсная группа', 'аутизм', 'школа', 'учитель', 'ребёнок', 'майнкрафт', 'игра', 'сервер', 'природные ресурсы', 'кадровый', 'hr', 'женский', 'женщины', 'энергия', 'практика', 'медитация', 'саблиминал', 'слушать', 'курс', 'обучение', 'тренинг']
  },
  {
    name: 'S9 | Психология денег', cpc: 1.2,
    keywords: [
      '+психолог по деньгам', 'психолог по деньгам онлайн', 'психолог по финансам', '+финансовый психолог',
      'финансовый психолог онлайн', 'финансовый психолог консультация', 'психолог денежное мышление',
      'психолог для предпринимателей онлайн', 'бизнес психолог онлайн|0.8', '+психология денег консультация',
      'консультация по денежным блокам', 'русскоязычный психолог онлайн|0.7'
    ],
    negatives: ['вакансии', 'профессия', 'как стать', 'обучение', 'курс', 'курсы', 'диплом', 'зарплата', 'книга', 'тест', 'ясно', 'альтер', 'b17', 'семейный', 'детский', 'отношения', 'бесплатный психолог', 'горячая линия']
  }
];

// ====================== ОБЪЯВЛЕНИЯ ======================
// Каждая группа — два объявления, это эксперимент:
//   «боль»    — узнавание → причина → как начать (бесплатные 15 минут);
//   «решение» — узнавание → чем работаем (снятие запретов / ресурсный консалтинг / ресурс) → доверие.
// code — метка объявления: уходит в ссылку как utm_content, в Telegram-бот как start=ads_<code>.
// Несколько фраз на одной позиции — Google чередует их, а в отчёте «Ресурсы» видно, какая сильнее.
var P3_BOL = ['Разговор 15 минут бесплатно', 'Онлайн из любой страны'];
var P3_RESH = ['60+ человек прошли работу', 'Архитектор ресурса'];
var SOLUTION = ['Снятие внутренних запретов', 'Ресурсный консалтинг онлайн', 'Работа с внутренним ресурсом'];
var D2_BOL = 'Первый шаг — бесплатный разговор на 15 минут. Диагностика платная, около двух часов.';
var D2_RESH = 'Онлайн, из любой страны. 15 минут бесплатно, диагностика платная. Видеоотзывы на сайте.';

var ADS = {
  'S1 | Обесценивание': [
    { code: 's1_bol', name: 'боль', path: ['цена', 'работы'],
      h1: ['Стыдно называть свою цену?', 'Страшно назвать свою цену?'],
      h2: ['Это не скромность, а защита', 'Так когда-то было безопаснее'], h3: P3_BOL,
      d1: 'Голос становится тише, а скидка появляется сама. Это не характер, а старое решение.', d2: D2_BOL },
    { code: 's1_resh', name: 'решение', path: ['цена', 'работы'],
      h1: ['Делаете хорошо, берёте мало', 'Работаете за копейки?'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Находим, когда стало безопаснее брать меньше, чем стоит работа, и снимаем этот запрет.', d2: D2_RESH }
  ],
  'S2 | Доход упёрся': [
    { code: 's2_bol', name: 'боль', path: ['доход', 'стоит'],
      h1: ['Доход годами на одной сумме', 'Почему доход стоит на месте'],
      h2: ['Держит не рынок, а решение', 'Причина — внутренний запрет'], h3: P3_BOL,
      d1: 'Доход поднимается и возвращается к привычной сумме, будто его держат. Держит запрет.', d2: D2_BOL },
    { code: 's2_resh', name: 'решение', path: ['доход', 'стоит'],
      h1: ['Курсы пройдены, сумма та же', 'Знания есть, а доход прежний'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Курсы дают знания, а решение о деньгах принято там, куда знания не доходят. Там работаем.', d2: D2_RESH }
  ],
  'S3 | Делаю всё кроме нужного': [
    { code: 's3_bol', name: 'боль', path: ['самосаботаж'],
      h1: ['Откладываете самое важное?', 'Делаете всё, кроме главного'],
      h2: ['Это не лень, а защита', 'Так психика бережёт от провала'], h3: P3_BOL,
      d1: 'Задача, которая принесёт деньги, кочует с понедельника на понедельник. Дело не в лени.', d2: D2_BOL },
    { code: 's3_resh', name: 'решение', path: ['самосаботаж'],
      h1: ['Знаете как, но не начинаете', 'Почему не получается начать'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Дисциплина не помогает: защите не нужны силы. Находим, от чего она бережёт, и снимаем.', d2: D2_RESH }
  ],
  'S4 | Самозванец': [
    { code: 's4_bol', name: 'боль', path: ['самозванец'],
      h1: ['Синдром самозванца?', 'Кажется, что вот-вот раскроют'],
      h2: ['Это защита, а не правда о вас', 'Причина — в старом решении'], h3: P3_BOL,
      d1: 'Опыт и результаты есть, а внутри ожидание разоблачения. И цены остаются ниже рынка.', d2: D2_BOL },
    { code: 's4_resh', name: 'решение', path: ['самозванец'],
      h1: ['Синдром самозванца и деньги', 'Работаете с оглядкой?'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Находим, когда появилось решение «мне нельзя» и от чего оно защищает. Затем снимаем его.', d2: D2_RESH }
  ],
  'S5 | Устал держать лицо': [
    { code: 's5_bol', name: 'боль', path: ['без', 'остановки'],
      h1: ['Работаете без остановки?', 'Отдых — с чувством вины?'],
      h2: ['Это не трудоголизм, а защита', 'Дело не в нагрузке'], h3: P3_BOL,
      d1: 'Со стороны всё в порядке. Только вы знаете, сколько сил уходит, чтобы так выглядело.', d2: D2_BOL },
    { code: 's5_resh', name: 'решение', path: ['без', 'остановки'],
      h1: ['Выгорание у предпринимателя', 'Устали от своего дела?'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Деньги разрешены только тяжёлые: через перегруз и без отдыха. Находим, откуда это.', d2: D2_RESH }
  ],
  'S6 | Чужое мнение': [
    { code: 's6_bol', name: 'боль', path: ['чужое', 'мнение'],
      h1: ['Важно, что подумают другие?', 'Трудно сказать «нет»?'],
      h2: ['Одобрение было безопасностью', 'Это не слабость, а защита'], h3: P3_BOL,
      d1: 'Цена — чтобы не осудили, «да» — чтобы не обидеть. Когда-то это защищало. Сейчас мешает.', d2: D2_BOL },
    { code: 's6_resh', name: 'решение', path: ['чужое', 'мнение'],
      h1: ['Страшно заявить о себе?', 'Стесняетесь продавать себя?'],
      h2: SOLUTION, h3: P3_RESH,
      d1: 'Страх быть на виду держит цены, блог и продажи. Находим, откуда он, и снимаем запрет.', d2: D2_RESH }
  ],
  'S7 | Внутренние запреты': [
    { code: 's7_bol', name: 'боль', path: ['внутренний', 'запрет'],
      h1: ['Внутренний запрет на деньги?', 'Денежные блоки не уходят?'],
      h2: ['Когда-то он вас защищал', 'Это старое решение, не судьба'], h3: P3_BOL,
      d1: 'Доход растёт ровно до суммы, которую вы себе внутренне разрешаете. Выше не пускает запрет.', d2: D2_BOL },
    { code: 's7_resh', name: 'решение', path: ['внутренний', 'запрет'],
      h1: ['Снятие внутренних запретов', 'Как снять внутренний запрет'],
      h2: ['Ресурсный консалтинг онлайн', 'Находим запрет и его причину'], h3: P3_RESH,
      d1: 'На диагностике видно, где стоит запрет и от чего он защищает. В программе его снимаем.', d2: D2_RESH }
  ],
  'S8 | Внутренний ресурс': [
    { code: 's8_bol', name: 'боль', path: ['внутренний', 'ресурс'],
      h1: ['Нет сил на свои же цели?', 'Где взять внутренний ресурс'],
      h2: ['Силы уходят на защиту', 'Ресурс есть, но он занят'], h3: P3_BOL,
      d1: 'Ресурс не пропал: он уходит на старую защиту от денег и перемен. Её можно найти и снять.', d2: D2_BOL },
    { code: 's8_resh', name: 'решение', path: ['внутренний', 'ресурс'],
      h1: ['Работа с внутренним ресурсом', 'Работа с подсознанием онлайн'],
      h2: ['Ресурсный консалтинг онлайн', 'Снятие внутренних запретов'], h3: P3_RESH,
      d1: 'Вы в ясном сознании и всё контролируете. Видите, что держит доход, и меняете настройку.', d2: D2_RESH }
  ],
  'S9 | Психология денег': [
    { code: 's9_bol', name: 'боль', path: ['психология', 'денег'],
      h1: ['Психология денег онлайн', 'Ищете специалиста по деньгам?'],
      h2: ['Доход держит внутренний запрет', 'Причина глубже знаний'], h3: P3_BOL,
      d1: 'Знаете, что делать с деньгами, а доход стоит. Значит, причина не в знаниях, а глубже.', d2: D2_BOL },
    { code: 's9_resh', name: 'решение', path: ['психология', 'денег'],
      h1: ['Консультация по деньгам онлайн', 'Деньги и психика: консалтинг'],
      h2: ['Ресурсный консалтинг онлайн', 'Снятие внутренних запретов'], h3: P3_RESH,
      d1: 'Архитектор ресурса: работа с подсознанием. Находим, что держит доход, и снимаем запрет.', d2: D2_RESH }
  ]
};

// Быстрые ссылки: [текст ≤25, адрес, строка 1 ≤35, строка 2 ≤35]
var SITELINKS = [
  ['Знакомство 15 минут', FINAL_URL + '/#booking', 'Бесплатный разговор по видео', 'Время выбираете в Telegram'],
  ['Видеоотзывы клиентов', FINAL_URL + '/#reviews', 'Больше 60 историй работы', 'Свой запрос и своя причина'],
  ['Как проходит работа', FINAL_URL + '/#how', 'Вы в сознании и всё помните', 'Без ритуалов и эзотерики'],
  ['Чек-лист: 10 признаков', FINAL_URL + '/chek-list/', 'Есть ли внутренний запрет', '5 минут, без регистрации']
];

var NEGATIVE_KEYWORDS_ADD = [
  'скачать', 'pdf', 'epub', 'fb2', 'книга', 'читать онлайн', 'торрент', 'реферат', 'курсовая', 'википедия',
  'что значит', 'перевод', 'на английском', 'картинки', 'мем', 'цитаты', 'стихи', 'песня', 'фильм', 'сериал', 'вакансия',
  'резюме', 'скам', 'развод', 'лохотрон', 'москва', 'санкт-петербург', 'спб', 'россия', 'екатеринбург', 'новосибирск',
  'казань', 'рутуб', 'дзен', 'вк', 'гадание', 'таро', 'руны', 'заговор', 'молитва', 'ритуал', 'нумерология', 'астрология',
  'гороскоп', 'луна', 'карма', 'порча', 'приворот', 'матрица судьбы', 'симптомы', 'таблетки', 'лечение', 'психиатр',
  'клиника', 'депрессия', 'панические атаки', 'для детей', 'подросток', 'школьник', 'студент', 'кредит', 'займ', 'казино', 'ставки'
];

var CALLOUTS = ['15 минут бесплатно', 'Диагностика платная', 'Онлайн из любой страны', '60+ человек прошли работу',
  'Ресурсный консалтинг', 'Без ритуалов и эзотерики'];
var SNIPPET_HEADER = 'Услуги';
var SNIPPET_VALUES = ['Знакомство 15 минут', 'Диагностика запретов', 'Снятие запретов', 'Ресурсный консалтинг'];

// ====================== ЛОГИКА ======================
var report = { created: [], existed: [], errors: [], warnings: [] };

function main() {
  var campaign = findCampaign(CAMPAIGN_NAME);
  if (!campaign) { Logger.log('==> Кампания не найдена.'); return; }
  report.existed.push('Кампания ' + campaign.getName());

  setCampaignSuffix(campaign);
  removeOldGroups(campaign);
  addNegativeKeywords(campaign);

  AD_GROUPS.forEach(function (spec) {
    try {
      var ag = ensureAdGroup(campaign, spec);
      ensureKeywords(ag, spec);
      ensureGroupNegatives(ag, spec.negatives);
      ensureRsa(ag, spec);
    } catch (e) { report.errors.push('Группа ' + spec.name + ': ' + e); }
  });

  replaceSitelinks(campaign);
  replaceCallouts(campaign);
  replaceSnippet(campaign);
  printReport();
}

function setCampaignSuffix(campaign) {
  var want = UTM_BASE + '&utm_content=sitelink';
  try {
    if (campaign.urls().getFinalUrlSuffix() !== want) { campaign.urls().setFinalUrlSuffix(want); report.created.push('Метки ссылок кампании'); }
    else report.existed.push('Метки ссылок кампании');
  } catch (e) { report.errors.push('Метки ссылок кампании: ' + e); }
}

function norm(s) { return String(s).replace(/[«»]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function findCampaign(name) {
  var it = AdsApp.campaigns().get();
  while (it.hasNext()) { var c = it.next(); if (norm(c.getName()) === norm(name)) return c; }
  return null;
}

function isKeepGroup(name) {
  for (var i = 0; i < KEEP_GROUP_PREFIXES.length; i++) if (name.indexOf(KEEP_GROUP_PREFIXES[i]) === 0) return true;
  return false;
}

function removeOldGroups(campaign) {
  var it = campaign.adGroups().get();
  var n = 0;
  while (it.hasNext()) {
    var g = it.next();
    if (isKeepGroup(g.getName())) continue;
    if (g.isEnabled()) { try { g.pause(); n++; report.created.push('На паузе: ' + g.getName()); } catch (e) {} }
  }
  if (!n) report.existed.push('Старых активных групп нет');
}

function addNegativeKeywords(campaign) {
  var existing = {};
  var it = campaign.negativeKeywords().get();
  while (it.hasNext()) existing[it.next().getText().replace(/^"|"$/g, '')] = true;
  var added = 0;
  NEGATIVE_KEYWORDS_ADD.forEach(function (kw) {
    if (existing[kw]) return;
    try { campaign.createNegativeKeyword('"' + kw + '"'); added++; } catch (e) { report.errors.push('Минус ' + kw + ': ' + e); }
  });
  report.created.push('Минус-слов кампании добавлено: ' + added);
}

function ensureAdGroup(campaign, spec) {
  var it = campaign.adGroups().get();
  while (it.hasNext()) {
    var g = it.next();
    if (norm(g.getName()) === norm(spec.name)) { report.existed.push('Группа ' + spec.name); if (!g.isEnabled()) g.enable(); try { g.bidding().setCpc(spec.cpc); } catch (e) {} return g; }
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
  var variants = ['"' + text + '"'];
  if (exact) variants.push('[' + text + ']');
  return { variants: variants, mult: mult };
}

// Ключ для сравнения: тип соответствия + текст без кавычек/скобок, без регистра, ё = е.
// Google может вернуть текст ключа не буква в букву, поэтому сравниваем по нормализованному виду.
function kwKey(text, matchType) {
  var t = String(text).trim();
  var mt = matchType;
  if (!mt) mt = t.charAt(0) === '[' ? 'EXACT' : (t.charAt(0) === '"' ? 'PHRASE' : 'BROAD');
  t = t.replace(/^[\["+]+|[\]"]+$/g, '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  return String(mt).toUpperCase() + ':' + t;
}

function ensureKeywords(ag, spec) {
  var existing = {}, have = 0;
  var it = ag.keywords().withCondition('Status IN [ENABLED, PAUSED]').get();
  while (it.hasNext()) {
    var kw = it.next(), mt = null;
    try { mt = kw.getMatchType(); } catch (e) {}
    existing[kwKey(kw.getText(), mt)] = true; have++;
  }
  var added = 0;
  spec.keywords.forEach(function (raw) {
    var k = parseKeyword(raw);
    k.variants.forEach(function (text) {
      var key = kwKey(text);
      if (existing[key]) return;
      existing[key] = true;
      var b = ag.newKeywordBuilder().withText(text).withFinalUrl(FINAL_URL);
      if (k.mult !== 1) b = b.withCpc(Math.round(spec.cpc * k.mult * 100) / 100);
      var op = b.build();
      if (op.isSuccessful()) added++; else report.errors.push('Ключ ' + text + ': ' + op.getErrors().join('; '));
    });
  });
  // Ключи, которых нет в списке группы (остались от прошлых версий), ставим на паузу — не удаляем.
  var wantedKeys = {}, paused = [];
  spec.keywords.forEach(function (raw) { parseKeyword(raw).variants.forEach(function (t) { wantedKeys[kwKey(t)] = true; }); });
  var it2 = ag.keywords().withCondition('Status = ENABLED').get();
  while (it2.hasNext()) {
    var k2 = it2.next(), mt2 = null;
    try { mt2 = k2.getMatchType(); } catch (e) {}
    if (!wantedKeys[kwKey(k2.getText(), mt2)]) { try { k2.pause(); paused.push(k2.getText()); } catch (e) {} }
  }
  if (paused.length) report.created.push(ag.getName() + ': ключи не из списка на паузе — ' + paused.join(', '));
  if (added) report.created.push(ag.getName() + ': ключей добавлено ' + added + ' (уже было ' + have + ')');
  else report.existed.push(ag.getName() + ': все ключи на месте (' + have + ')');
}

function ensureGroupNegatives(ag, negatives) {
  var existing = {};
  var it = ag.negativeKeywords().get();
  while (it.hasNext()) existing[it.next().getText().replace(/^"|"$/g, '')] = true;
  var added = 0;
  negatives.forEach(function (kw) {
    if (existing[kw]) return;
    try { ag.createNegativeKeyword('"' + kw + '"'); added++; } catch (e) { report.errors.push('Минус группы ' + kw + ': ' + e); }
  });
  if (added) report.created.push(ag.getName() + ': минусов группы ' + added);
}

function textOf(x) { return String(Array.isArray(x) ? x[0] : x); }

// Подпись объявления = заголовки + описания (с учётом обрезки по лимиту).
// Поменяли любой текст — при запуске старое объявление встанет на паузу, создастся новое.
function adSignature(headlines, descriptions, suffix) {
  var h = headlines.map(function (x) { return textOf(x).slice(0, 30); }).sort();
  var d = descriptions.map(function (x) { return textOf(x).slice(0, 90); }).sort();
  return h.join('|') + '##' + d.join('|') + '##' + (suffix || '');
}

function pinAll(list, pin) { return list.map(function (t) { return [t, pin]; }); }

function ensureRsa(ag, spec) {
  var wanted = (ADS[spec.name] || []).map(function (a) {
    return {
      label: a.code + ' (' + a.name + ')',
      suffix: UTM_BASE + '&utm_content=' + a.code,
      path: a.path || [],
      headlines: pinAll(a.h1, 'HEADLINE_1').concat(pinAll(a.h2, 'HEADLINE_2'), pinAll(a.h3, 'HEADLINE_3')),
      descriptions: [[a.d1, 'DESCRIPTION_1'], [a.d2, 'DESCRIPTION_2']]
    };
  });
  if (!wanted.length) { report.warnings.push(ag.getName() + ': нет текстов объявлений'); return; }
  var wantedSigs = wanted.map(function (w) { return adSignature(w.headlines, w.descriptions, w.suffix); });
  var have = {};
  var ads = ag.ads().get();
  while (ads.hasNext()) {
    var ad = ads.next();
    try {
      if (ad.getType() !== 'RESPONSIVE_SEARCH_AD') { if (!ad.isPaused()) ad.pause(); continue; }
      var rsa = ad.asType().responsiveSearchAd();
      var hs = adSignature(rsa.getHeadlines().map(function (h) { return h.text; }),
                           rsa.getDescriptions().map(function (d) { return d.text; }),
                           ad.urls().getFinalUrlSuffix());
      if (wantedSigs.indexOf(hs) !== -1) { have[hs] = true; if (ad.isPaused()) ad.enable(); }
      else if (!ad.isPaused()) { ad.pause(); report.created.push(ag.getName() + ': старое объявление на паузе'); }
    } catch (e) { report.warnings.push(ag.getName() + ': не прочитал объявление — ' + e); }
  }
  wanted.forEach(function (w, i) {
    if (have[wantedSigs[i]]) { report.existed.push(ag.getName() + ': объявление ' + w.label); return; }
    var b = ag.newAd().responsiveSearchAdBuilder().withFinalUrl(FINAL_URL).withFinalUrlSuffix(w.suffix);
    if (w.path[0]) b.withPath1(w.path[0]);
    if (w.path[1]) b.withPath2(w.path[1]);
    w.headlines.forEach(function (h) {
      var text = h[0];
      if (text.length > 30) { report.warnings.push(ag.getName() + ': >30 — ' + text); text = text.slice(0, 30); }
      b.addHeadline(text, h[1]);
    });
    w.descriptions.forEach(function (d) {
      var text = d[0];
      if (text.length > 90) { report.warnings.push(ag.getName() + ': >90 — ' + text); text = text.slice(0, 90); }
      b.addDescription(text, d[1]);
    });
    var op = b.build();
    if (op.isSuccessful()) report.created.push(ag.getName() + ': объявление ' + w.label);
    else report.errors.push(ag.getName() + ' объявление ' + w.label + ': ' + op.getErrors().join('; '));
  });
}

function replaceSitelinks(campaign) {
  var want = {};
  SITELINKS.forEach(function (x) { want[x[0]] = x; });
  var keep = {};
  try {
    var it = campaign.extensions().sitelinks().get();
    while (it.hasNext()) {
      var sl = it.next(), w = want[sl.getLinkText()];
      if (w && sl.getDescription1() === w[2] && sl.getDescription2() === w[3]) keep[w[0]] = true;
      else { try { campaign.removeSitelink(sl); report.created.push('Убрана ссылка ' + sl.getLinkText()); } catch (e) {} }
    }
  } catch (e) { report.warnings.push('Быстрые ссылки: не прочитал — ' + e); }
  SITELINKS.forEach(function (x) {
    if (keep[x[0]]) { report.existed.push('Ссылка ' + x[0]); return; }
    try {
      var op = AdsApp.extensions().newSitelinkBuilder().withLinkText(x[0]).withFinalUrl(x[1])
        .withDescription1(x[2]).withDescription2(x[3]).build();
      if (op.isSuccessful()) { campaign.addSitelink(op.getResult()); report.created.push('Ссылка ' + x[0]); }
      else report.errors.push('Ссылка ' + x[0] + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Ссылка ' + x[0] + ': ' + e); }
  });
}

function replaceCallouts(campaign) {
  var keep = {};
  try {
    var ci = campaign.extensions().callouts().get();
    while (ci.hasNext()) {
      var c = ci.next();
      if (CALLOUTS.indexOf(c.getText()) !== -1) keep[c.getText()] = true;
      else { try { campaign.removeCallout(c); } catch (e) {} }
    }
  } catch (e) {}
  CALLOUTS.forEach(function (t) {
    if (keep[t]) return;
    try {
      var op = AdsApp.extensions().newCalloutBuilder().withText(t).build();
      if (op.isSuccessful()) { campaign.addCallout(op.getResult()); report.created.push('Уточнение ' + t); }
      else report.errors.push('Уточнение ' + t + ': ' + op.getErrors().join('; '));
    } catch (e) { report.errors.push('Уточнение ' + t + ': ' + e); }
  });
}

function replaceSnippet(campaign) {
  try {
    var ok = false;
    var sn = campaign.extensions().snippets().get();
    while (sn.hasNext()) {
      var sp = sn.next();
      if (sp.getHeader() === SNIPPET_HEADER && sp.getValues().join('|') === SNIPPET_VALUES.join('|')) ok = true;
      else { try { campaign.removeSnippet(sp); } catch (e) {} }
    }
    if (!ok) {
      var op = AdsApp.extensions().newSnippetBuilder().withHeader(SNIPPET_HEADER).withValues(SNIPPET_VALUES).build();
      if (op.isSuccessful()) { campaign.addSnippet(op.getResult()); report.created.push('Структ. описание'); }
      else report.errors.push('Структ. описание: ' + op.getErrors().join('; '));
    }
  } catch (e) { report.errors.push('Структ. описание: ' + e); }
}

function printReport() {
  Logger.log('========== ИТОГ ==========');
  Logger.log('СОЗДАНО:\n  ' + (report.created.join('\n  ') || '—'));
  Logger.log('УЖЕ БЫЛО:\n  ' + (report.existed.join('\n  ') || '—'));
  Logger.log('ПРЕДУПРЕЖДЕНИЯ:\n  ' + (report.warnings.join('\n  ') || '—'));
  Logger.log('ОШИБКИ:\n  ' + (report.errors.join('\n  ') || '—'));
}
