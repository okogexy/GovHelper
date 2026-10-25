export const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'criminal', label: 'УК' },
  { id: 'procedure', label: 'ПК' },
  { id: 'road', label: 'ДК' },
  { id: 'admin', label: 'АК' },
  { id: 'charter', label: 'Устав' },
  { id: 'laws', label: 'Законы' },
];

export function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('\u0451', '\u0435')
    .replace(/[^a-z\u0430-\u044f0-9.]+/gi, ' ')
    .trim();
}

export function articleCategory(codeName) {
  const code = normalize(codeName);
  if (code.includes('уголовн')) return 'criminal';
  if (code.includes('процессуальн')) return 'procedure';
  if (code.includes('дорожн')) return 'road';
  if (code.includes('административн')) return 'admin';
  if (code.includes('этическ') || code.includes('устав')) return 'charter';
  return 'laws';
}

function searchable(article) {
  return normalize([
    article.id,
    article.title,
    article.description,
    article.punishment,
    article.code,
    ...(article.keywords || []),
  ].join(' '));
}

const DOCUMENT_CACHE = new WeakMap();
const RESULT_CACHE = new WeakMap();
const ALTERNATIVES_CACHE = new Map();

function getDocument(article) {
  const cached = DOCUMENT_CACHE.get(article);
  if (cached) return cached;
  const haystack = searchable(article);
  const words = [...new Set(haystack.split(' ').filter(Boolean))];
  const stemWords = new Map();
  for (const word of words) {
    const value = stem(word);
    if (!stemWords.has(value)) stemWords.set(value, word);
  }
  const document = {
    haystack,
    words,
    wordSet: new Set(words),
    stemWords,
    id: normalize(article.id),
    title: normalize(article.title),
    description: normalize(article.description),
    punishment: normalize(article.punishment),
    code: normalize(article.code),
    keywords: normalize(article.keywords?.join(' ')),
    category: articleCategory(article.code),
  };
  DOCUMENT_CACHE.set(article, document);
  return document;
}

const KEYBOARD_FROM = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.';
const KEYBOARD_TO = '\u0439\u0446\u0443\u043a\u0435\u043d\u0433\u0448\u0449\u0437\u0445\u044a\u0444\u044b\u0432\u0430\u043f\u0440\u043e\u043b\u0434\u0436\u044d\u044f\u0447\u0441\u043c\u0438\u0442\u044c\u0431\u044e';
const SYNONYMS = {
  \u043e\u0440\u0443\u0436\u0438\u0435: ['\u043f\u0443\u0448\u043a\u0430', '\u0441\u0442\u0432\u043e\u043b', '\u043e\u0433\u043d\u0435\u0441\u0442\u0440\u0435\u043b'],
  \u043d\u0430\u0440\u043a\u043e\u0442\u0438\u043a\u0438: ['\u043d\u0430\u0440\u043a\u043e\u0442\u0438\u043a', '\u043d\u0430\u0440\u043a\u043e\u0442\u0430', '\u0432\u0435\u0449\u0435\u0441\u0442\u0432\u0430'],
  \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043e: ['\u0443\u0431\u0438\u043b', '\u0441\u043c\u0435\u0440\u0442\u044c', '\u043b\u0438\u0448\u0435\u043d\u0438\u0435 \u0436\u0438\u0437\u043d\u0438'],
  \u0448\u0442\u0440\u0430\u0444: ['\u0434\u0435\u043d\u0435\u0436\u043d\u043e\u0435 \u0432\u0437\u044b\u0441\u043a\u0430\u043d\u0438\u0435'],
  \u0442\u044e\u0440\u044c\u043c\u0430: ['\u043b\u0438\u0448\u0435\u043d\u0438\u0435 \u0441\u0432\u043e\u0431\u043e\u0434\u044b', '\u0437\u0430\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435'],
  \u0430\u0440\u0435\u0441\u0442: ['\u0437\u0430\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435', '\u0437\u0430\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435'],
  \u043c\u0430\u0448\u0438\u043d\u0430: ['\u0430\u0432\u0442\u043e', '\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044c', '\u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442'],
  \u0432\u0437\u044f\u0442\u043a\u0430: ['\u043f\u043e\u0434\u043a\u0443\u043f', '\u043a\u043e\u0440\u0440\u0443\u043f\u0446\u0438\u044f'],
  угон: ['неправомерное завладение автомобилем', 'неправомерное завладение транспортным средством', 'автоугон'],
  ограбление: ['грабеж', 'разбой', 'хищение имущества'],
  кража: ['тайное хищение имущества', 'хищение чужого имущества', 'украл'],
  нападение: ['разбой', 'применение насилия', 'причинение вреда'],
  похищение: ['похищение человека', 'незаконное лишение свободы', 'заложник'],
  мошенничество: ['обман', 'злоупотребление доверием', 'хищение имущества'],
  вымогательство: ['требование передачи имущества', 'угроза насилия', 'шантаж'],
  взлом: ['незаконное проникновение', 'несанкционированный доступ'],
  драка: ['побои', 'причинение вреда здоровью', 'насилие'],
  заложник: ['захват заложника', 'похищение человека'],
  пьяный: ['алкогольное опьянение', 'состояние опьянения'],
  скрыться: ['оставление места происшествия', 'неподчинение', 'уклонение'],
};

export function swapKeyboard(value) {
  return [...value].map((letter) => {
    const ru = KEYBOARD_TO.indexOf(letter);
    if (ru >= 0) return KEYBOARD_FROM[ru];
    const en = KEYBOARD_FROM.indexOf(letter);
    return en >= 0 ? KEYBOARD_TO[en] : letter;
  }).join('');
}

function stem(word) {
  if (word.length < 5 || /\d/.test(word)) return word;
  return word.replace(/(иями|ями|ами|его|ого|ему|ому|иях|ах|ях|ость|ение|ания|ить|ать|ять|ыть|ий|ый|ой|ая|яя|ое|ее|ые|ие|ия|ью|ья|ию|ам|ям|ом|ем|ов|ев|ы|и|а|я|у|ю|е|о)$/u, '');
}

function distance(left, right, max = 2) {
  if (Math.abs(left.length - right.length) > max) return max + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[right.length];
}

function queryParts(query) {
  const raw = String(query || '');
  const phrases = [...raw.matchAll(/["\u00ab]([^"\u00bb]+)["\u00bb]/g)].map((match) => normalize(match[1])).filter(Boolean);
  const withoutPhrases = raw.replace(/["\u00ab][^"\u00bb]+["\u00bb]/g, ' ');
  const negative = [...withoutPhrases.matchAll(/(?:^|\s)-([^\s]+)/g)].map((match) => normalize(match[1])).filter(Boolean);
  const positive = withoutPhrases
    .replace(/(?:^|\s)-[^\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .flatMap((token) => /^[a-z[\];',.]+$/i.test(token) ? [token.toLowerCase()] : normalize(token).split(' '))
    .filter(Boolean);
  return { phrases, negative, positive };
}

function alternatives(token) {
  if (ALTERNATIVES_CACHE.has(token)) return ALTERNATIVES_CACHE.get(token);
  const layout = normalize(swapKeyboard(token));
  const direct = SYNONYMS[token] || [];
  const reverse = Object.entries(SYNONYMS)
    .filter(([, values]) => values.some((value) => normalize(value).split(' ').includes(token)))
    .map(([key]) => key);
  const result = [...new Set([token, layout, ...direct.map(normalize), ...reverse].filter(Boolean))];
  ALTERNATIVES_CACHE.set(token, result);
  if (ALTERNATIVES_CACHE.size > 500) ALTERNATIVES_CACHE.delete(ALTERNATIVES_CACHE.keys().next().value);
  return result;
}

function bestTokenMatch(token, document) {
  let best = null;
  for (const option of alternatives(token)) {
    if (option.includes(' ') && document.haystack.includes(option)) return { score: 18, term: option };
    if (document.wordSet.has(option)) return { score: 24, term: option };
    const stemmed = stem(option);
    if (stemmed.length >= 3 && document.stemWords.has(stemmed)) {
      best = { score: 13, term: document.stemWords.get(stemmed) };
    }
    for (const word of document.words) {
      if (word.startsWith(option) || option.startsWith(word)) {
        if (Math.min(word.length, option.length) >= 3) best = best?.score >= 16 ? best : { score: 16, term: word };
      }
    }
    if (best?.score >= 13) continue;
    if (option.length >= 4) {
      for (const word of document.words) {
        if (word.length < 4) continue;
        const max = option.length >= 8 ? 2 : 1;
        if (distance(option, word, max) <= max) best = best?.score >= 9 ? best : { score: 9, term: word };
      }
    }
  }
  return best;
}

function conceptPhraseMatches(phrase, document) {
  const value = normalize(phrase);
  if (!value) return false;
  const coreText = `${document.title} ${document.description}`;
  if (coreText.includes(value)) return true;
  const coreWords = coreText.split(' ').filter(Boolean);
  const tokens = value.split(' ').filter(Boolean);
  return tokens.every((token) => {
    const tokenStem = stem(token);
    return coreWords.some((word) => {
      const wordStem = stem(word);
      return wordStem === tokenStem
        || (Math.min(wordStem.length, tokenStem.length) >= 5 && (wordStem.startsWith(tokenStem) || tokenStem.startsWith(wordStem)));
    });
  });
}

export function searchArticles(articles, query, filter = 'all', limit = 120) {
  const source = articles || [];
  let cache = RESULT_CACHE.get(source);
  if (!cache) {
    cache = new Map();
    RESULT_CACHE.set(source, cache);
  }
  const cacheKey = `${filter}\u0000${limit}\u0000${String(query || '')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const { phrases, negative, positive: tokens } = queryParts(query);
  const results = [];
  for (const article of source) {
    const document = getDocument(article);
    if (filter !== 'all' && document.category !== filter) continue;
    if (!tokens.length && !phrases.length && !negative.length) {
      results.push({ article, score: 0 });
      continue;
    }
    if (negative.some((token) => alternatives(token).some((option) => document.haystack.includes(option)))) continue;
    if (phrases.some((phrase) => !document.haystack.includes(phrase))) continue;
    const matches = tokens.map((token) => bestTokenMatch(token, document));
    if (matches.some((match) => !match)) continue;
    let score = phrases.length * 35 + matches.reduce((sum, match) => sum + match.score, 0);
    for (const token of tokens) {
      if (document.id === token || document.id.endsWith(` ${token}`)) score += 100;
      if (document.id.includes(token)) score += 35;
      if (document.title.startsWith(token)) score += 20;
      else if (document.title.includes(token)) score += 10;
      if (document.keywords.includes(token)) score += 8;
    }
    results.push({
      article: {
        ...article,
        _searchMatches: [...new Set([...phrases, ...tokens, ...matches.map((match) => match.term)].filter((term) => term.length > 1))],
      },
      score,
    });
  }
  const output = results
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id, 'ru', { numeric: true }))
    .slice(0, limit)
    .map((item) => item.article);
  cache.set(cacheKey, output);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return output;
}

export function isFavorite(article, favorites = []) {
  return favorites.includes(article.uid) || favorites.includes(article.id);
}

const ASSISTANT_STOP_WORDS = new Set(normalize('а и но или ли же бы в во на по под над за из от до у к ко с со о об про для при без через что какой какая какое какие как когда где кто кого кому чем это этот эта эти тот мне мне скажи подскажи пожалуйста можно ли будет если случае делать значит насчет поводу еще также грозит грозить карается последствия совершил совершили сделал сделали человек люди лицо гражданин граждане общественный общественном место месте').split(' '));
const GENERIC_LEGAL_WORDS = new Set(normalize('наказание наказан штраф срок статья закон ответственность подробнее почему грозит карается последствия').split(' '));
const GREETINGS = /^(привет|здравствуй|здравствуйте|добрый (день|вечер|утро)|хай|hello|hi)(?:$|\s)/u;
const THANKS = /^(спасибо|благодарю|понял|поняла|ясно|окей|ок)(?:$|\s)/u;
const IDENTITY_QUESTION = /(^| )(кто ты|кто ты такой|кто ты такая|ты кто|что ты|что ты такое|что за помощник|ты человек|ты бот|ты ии|ты ai|ты являешься ии|являешься ли ты ии|как тебя зовут|представься)( |$)/u;
const CAPABILITIES_QUESTION = /^(что ты умеешь|что умеешь|чем можешь помочь|возможности|помоги|что делаешь|как ты работаешь)(?:$|\s)/u;
const WELLBEING_QUESTION = /^(как дела|как ты|ты тут|ты здесь|работаешь|на связи)(?:$|\s)/u;
const FAREWELL = /^(пока|до свидания|до встречи|увидимся|спокойной ночи)(?:$|\s)/u;
const CREATOR_QUESTION = /(^| )(кто тебя (сделал|создал|разработал)|кто твой разработчик)( |$)/u;
const VERSION_QUESTION = /(^| )(какая версия|версия программы|твоя версия)( |$)/u;
const SERVER_QUESTION = /(^| )(какой сервер|на каком сервере|текущий сервер)( |$)/u;

const LEGAL_CONCEPTS = [
  { aliases: ['обыск', 'обыскать', 'провести обыск', 'обыск без ордера', 'досмотр', 'личный досмотр'], phrases: ['личный обыск', 'проведение обыска', 'обыск', 'досмотр'], category: 'procedure' },
  { aliases: ['задержание', 'задержать', 'арестовать', 'основания задержания', 'сколько могут держать'], phrases: ['основания для задержания', 'процедура задержания', 'задержание', 'арест'], category: 'procedure' },
  { aliases: ['права задержанного', 'зачитать права', 'правило миранды', 'миранда'], phrases: ['права задержанного', 'правило миранды', 'разъяснить права'], category: 'procedure' },
  { aliases: ['применение силы', 'применить силу', 'использовать оружие сотруднику', 'спецсредства'], phrases: ['применение физической силы', 'применение оружия', 'специальные средства'], category: 'procedure' },
  { aliases: ['угон', 'угнал', 'угнали', 'угнать', 'автоугон', 'украл машину', 'украли машину', 'украл автомобиль', 'украли автомобиль'], phrases: ['неправомерное завладение', 'угон автомобиля', 'угон транспортного средства'], category: 'criminal' },
  { aliases: ['ограбление', 'ограбил', 'ограбили', 'грабанул', 'грабеж', 'разбой', 'ограбление банка', 'ограбление магазина'], phrases: ['грабеж', 'разбой'], category: 'criminal' },
  { aliases: ['кража', 'украл', 'украли', 'воровство', 'своровал'], phrases: ['тайное хищение', 'хищение чужого имущества', 'кража'], category: 'criminal' },
  { aliases: ['убийство', 'убил', 'лишил жизни', 'смерть человека'], phrases: ['умышленное причинение смерти', 'убийство'], category: 'criminal' },
  { aliases: ['похищение', 'похитил', 'украл человека', 'держит силой'], phrases: ['похищение человека', 'незаконное лишение свободы'], category: 'criminal' },
  { aliases: ['мошенничество', 'обманул на деньги', 'развел на деньги', 'скам'], phrases: ['мошенничество', 'хищение путем обмана', 'злоупотребление доверием'], category: 'criminal' },
  { aliases: ['вымогательство', 'вымогал', 'шантаж', 'требует деньги под угрозой'], phrases: ['вымогательство', 'требование передачи имущества'], category: 'criminal' },
  { aliases: ['взятка', 'дал взятку', 'взял взятку', 'подкуп'], phrases: ['дача взятки', 'получение взятки', 'подкуп'], category: 'criminal' },
  { aliases: ['наркотики', 'наркота', 'наркотические вещества', 'продажа наркотиков', 'закладка'], phrases: ['наркотическое средство', 'наркотические вещества', 'сбыт наркотических средств', 'распространение наркотических средств', 'хранение наркотических средств', 'хранение наркотических веществ'], category: 'criminal' },
  { aliases: ['незаконное оружие', 'оружие без лицензии', 'левый ствол'], phrases: ['незаконное хранение оружия', 'незаконное ношение оружия', 'огнестрельное оружие'], category: 'criminal' },
  { aliases: ['драка', 'избил', 'побил', 'ударил человека', 'нанес телесные повреждения', 'напал и избил'], phrases: ['нанесение телесных повреждений', 'причинение вреда здоровью', 'телесные повреждения', 'побои', 'насилие'], category: 'criminal' },
  { aliases: ['заложник', 'захватил заложника', 'взяли в заложники'], phrases: ['захват заложника', 'удержание заложника'], category: 'criminal' },
  { aliases: ['пьяный за рулем', 'нетрезвый за рулем', 'вождение пьяным'], phrases: ['управление транспортным средством в состоянии опьянения', 'алкогольное опьянение'], category: 'road' },
  { aliases: ['скрылся с места дтп', 'уехал после дтп', 'покинул место аварии'], phrases: ['оставление места дорожно транспортного происшествия', 'оставление места дтп'], category: 'road' },
  { aliases: ['сопротивление полиции', 'сопротивлялся полиции', 'не подчинился полиции', 'неповиновение', 'игнорировал требование'], phrases: ['неповиновение законному требованию', 'сопротивление сотруднику', 'отказ от выполнения законного требования'], category: 'admin' },
  { aliases: ['уход от погони', 'ушел от погони', 'скрылся от полиции', 'уехал от полиции', 'погоня'], phrases: ['уход от преследования', 'невыполнение требования об остановке', 'скрытие от сотрудников'], category: 'road' },
  { aliases: ['проникновение', 'залез на частную территорию', 'незаконно проник', 'вломился'], phrases: ['незаконное проникновение', 'нарушение неприкосновенности частной собственности'], category: 'criminal' },
  { aliases: ['повредил имущество', 'сломал чужое', 'разбил машину', 'вандализм'], phrases: ['умышленное повреждение имущества', 'уничтожение чужого имущества', 'вандализм'], category: 'criminal' },
  { aliases: ['стрельба в городе', 'открыл огонь', 'стрелял в общественном месте'], phrases: ['неправомерное использование оружия', 'стрельба в общественном месте', 'применение огнестрельного оружия'], category: 'criminal' },
  { aliases: ['превышение скорости', 'ехал слишком быстро', 'скорость выше разрешенной'], phrases: ['превышение установленной скорости', 'нарушение скоростного режима'], category: 'road' },
  { aliases: ['громкая музыка ночью', 'громко играет ночью', 'играет на гитаре ночью', 'громко играет на гитаре', 'шум ночью', 'нарушение тишины', 'кричал ночью', 'мешает спать музыкой'], phrases: ['громкие выкрикивания', 'включение музыки в ночное время', 'музыки в ночное время', 'ночное время суток'], category: 'admin' },
  { aliases: ['хулиганство', 'хулиганил', 'устроил дебош', 'мелкое хулиганство', 'нарушал общественный порядок'], phrases: ['мелкое хулиганство', 'хулиганство', 'грубое систематическое нарушение общественного порядка', 'нарушение общественного порядка'], category: 'admin' },
];

const SCENARIO_RULES = [
  {
    when: /(продал|продает|сбыл|сбывал|распространял|закладк).{0,35}(наркот|веществ)|(?:наркот|веществ).{0,35}(продал|сбыл|распространял|закладк)/u,
    prefer: /(сбыт|распространение|продажа)/u,
    avoid: /(?:только |личн.{0,3} )?(хранение|приобретение)/u,
  },
  {
    when: /(хранил|носил|приобрел|перевозил).{0,30}(наркот|веществ)|(?:наркот|веществ).{0,30}(хранил|носил|приобрел|перевозил)/u,
    prefer: /(хранение|приобретение|перевозка)/u,
    avoid: /(сбыт|распространение|продажа)/u,
  },
  {
    when: /(дал|передал|предложил|дача).{0,25}взятк/u,
    prefer: /(дача|предложение) взятки/u,
    avoid: /получение взятки/u,
  },
  {
    when: /(взял|получил|требовал|получение).{0,25}взятк/u,
    prefer: /получение взятки/u,
    avoid: /(дача|предложение) взятки/u,
  },
  {
    when: /(стрелял|открыл огонь|применил|использовал).{0,30}(оруж|ствол)|(?:оруж|ствол).{0,30}(стрелял|применил|использовал)/u,
    prefer: /(применение|использование|стрельба).{0,35}оруж/u,
    avoid: /(хранение|ношение).{0,25}оруж/u,
  },
  {
    when: /(хранил|носил|приобрел|перевозил).{0,30}(оруж|ствол)|(?:оруж|ствол).{0,30}(без лиценз|хранил|носил)/u,
    prefer: /(хранение|ношение|приобретение|перевозка).{0,35}оруж/u,
    avoid: /(применение|использование|стрельба).{0,35}оруж/u,
  },
  {
    when: /(заложник|взял в заложники|удерживал.{0,20}(требовал|шантаж))/u,
    prefer: /(заложник|захват.{0,20}залож)/u,
    avoid: /похищение человека/u,
  },
  {
    when: /(похитил|похищение|украл человека)/u,
    prefer: /похищение человека/u,
    avoid: /заложник/u,
  },
  {
    when: /(скрылся|уехал|сбежал).{0,30}(места )?(дтп|аварии)/u,
    prefer: /(оставление|покинул).{0,35}(дтп|происшеств|аварии)/u,
    avoid: /скоростн|опьянен/u,
  },
];

function scenarioScore(clean, document) {
  const text = `${document.title} ${document.description}`;
  let score = 0;
  for (const rule of SCENARIO_RULES) {
    if (!rule.when.test(clean)) continue;
    if (rule.prefer.test(text)) score += 320;
    if (rule.avoid.test(text)) score -= 420;
  }
  const physicalAttack = /(избил|побил|ударил|нанес.{0,20}телесн|причинил.{0,20}вред|ранил)/u.test(clean)
    && !/(ограб|грабеж|разбой|хищен|украл|отобрал)/u.test(clean);
  if (physicalAttack) {
    if (/(нанесение телесных повреждений|причинение вреда здоровью|телесные повреждения|побои)/u.test(text)) score += 360;
    if (/(разбой|хищение|грабеж)/u.test(text)) score -= 440;
    if (/хулиганств/u.test(text) && !/хулиган/u.test(clean)) score -= 260;
  }
  const humanVictim = /(человек|граждан|прохож|мужчин|женщин|парн|девуш)/u.test(clean);
  const animalVictim = /(животн|собак|кошк|лошад|олень)/u.test(clean);
  if (humanVictim && !animalVictim && /(животн|собак|кошк|лошад|олень)/u.test(text)) score -= 620;
  if (animalVictim) {
    if (/(животн|собак|кошк|лошад|олень)/u.test(text)) score += 360;
    else if (/(другому человеку|здоровью человека)/u.test(text)) score -= 300;
  }
  return score;
}

function qualificationDetails(clean) {
  const details = [];
  if (/(с оруж|ствол|пистолет|автомат)/u.test(clean)) details.push('оружие');
  if (/(насили|избил|ранил|напал)/u.test(clean)) details.push('насилие');
  if (/(групп|вдвоем|втроем|сообщник)/u.test(clean)) details.push('группа лиц');
  if (/(угроз|шантаж)/u.test(clean)) details.push('угроза');
  if (/(должностн|сотрудник|при исполнении)/u.test(clean)) details.push('служебный статус');
  return [...new Set(details)].slice(0, 3);
}

function benignSituationAnswer(clean) {
  const music = /(играет|играл|исполняет|поет).{0,30}(гитар|музыкальн.{0,8} инструмент)|(?:гитар|музыкальн.{0,8} инструмент).{0,30}(играет|играл|исполняет)/u.test(clean);
  const aggravating = /(громк|ноч|после 22|до 08|меша|оскорб|угрож|напал|дра|оруж|поврежд|требовани.{0,15}прекрат)/u.test(clean);
  if (music && !aggravating) {
    return 'Само по себе исполнение музыки или игра на гитаре в общественном месте не указывает на нарушение. Ответственность может возникнуть из-за дополнительных обстоятельств — например, громкой музыки ночью, нарушения порядка, помех движению или отказа выполнить законное требование. Уточните эти детали, если они были.';
  }
  return '';
}

function assistantTokens(value) {
  return [...new Set(normalize(value).split(' ').filter((word) => word.length > 1 && !ASSISTANT_STOP_WORDS.has(word)))];
}

function detectedConcepts(clean) {
  const words = clean.split(' ');
  const matches = LEGAL_CONCEPTS.flatMap((concept) => {
    const specificity = concept.aliases.reduce((best, alias) => {
      const value = normalize(alias);
      const matched = value.includes(' ')
        ? clean.includes(value)
        : words.some((word) => word === value || stem(word) === stem(value));
      return matched ? Math.max(best, value.split(' ').length) : best;
    }, 0);
    return specificity ? [{ ...concept, specificity }] : [];
  });
  const violentRobbery = !/(без оруж|без насили)/u.test(clean) && /(с оруж|насили|угроз|напал|избил|ранил)/u.test(clean);
  const adjusted = violentRobbery ? matches.map((concept) => concept.phrases.includes('грабеж') ? { ...concept, phrases: ['разбой', 'грабеж'] } : concept) : matches;
  const vehicleTheft = /(угон|угнал|угнали|угнать|автоугон|украл (машину|автомобиль)|украли (машину|автомобиль))/u.test(clean);
  return vehicleTheft ? adjusted.filter((concept) => !concept.phrases.includes('кража')) : adjusted;
}

function sentence(value, max = 420) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const boundary = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '));
  return `${cut.slice(0, boundary > max * .55 ? boundary + 1 : max).trim()}…`;
}

function articleLabel(article) {
  return `${article.id}${article.code ? ` · ${article.code}` : ''}`;
}

function cleanArticleTitle(value) {
  return String(value || '')
    .replace(/^\s*[★☆*]+\s*/u, '')
    .replace(/^\s*(?:\((?:R|F|S|Ф|Р)(?:\s*[/,]\s*(?:R|F|S|Ф|Р))*\)|\[(?:[^\]]{1,80})\])\s*/iu, '')
    .trim();
}

function articleHeadline(article, max = 320) {
  const title = String(article?.title || '').trim();
  const cleanTitle = cleanArticleTitle(title);
  const description = String(article?.description || '').trim();
  const normalizedTitle = normalize(cleanTitle);
  const badgeOnly = !normalizedTitle || /^(?:f|r|s|ф|р|федеральн(?:ая|ый)|региональн(?:ая|ый)|финансовая|военная)(?: (?:f|r|s|ф|р|федеральн(?:ая|ый)|региональн(?:ая|ый)|финансовая|военная))*$/u.test(normalizedTitle);
  const comparableDescription = normalize(description.replace(/^\s*(?:\([^)]{1,12}\)\s*)?(?:[★☆*]+\s*)?(?:\[[^\]]+\]\s*)?/iu, ''));
  const truncatedTitle = normalizedTitle.length > 10
    && comparableDescription.length > normalizedTitle.length
    && comparableDescription.startsWith(normalizedTitle);
  const source = badgeOnly || truncatedTitle ? description : cleanTitle;
  return sentence(source, max);
}

function punishmentText(value) {
  return sentence(String(value || '').replace(/^\s*наказание\s*:\s*/iu, ''), 520);
}

function hooliganismAnswer(database, clean) {
  if (!/(хулиган|дебош|нарушал общественный порядок)/u.test(clean)) return null;
  const source = database?.articles || [];
  const findArticle = (category, pattern) => source.find((article) =>
    articleCategory(article.code) === category
      && pattern.test(normalize(`${article.title} ${article.description}`)),
  );
  const petty = findArticle('admin', /мелкое хулиганство/u);
  const criminal = findArticle('criminal', /хулиганство.{0,80}грубое|грубое систематическое нарушение общественного порядка/u);
  const injury = findArticle('criminal', /нанесение телесных повреждений|причинение вреда здоровью|телесные повреждения|побои/u);
  const physicalHarm = /(избил|побил|ударил|нанес.{0,20}телесн|причинил.{0,20}вред|ранил)/u.test(clean);
  const attackOnly = /(напал|нападение)/u.test(clean) && !physicalHarm;
  const systematic = /(системат|неоднократ|продолжал|игнорировал|отказался.{0,15}прекрат|грубое)/u.test(clean);
  const minor = /(мелк|нецензур|жест|размахивал.{0,15}кулак|дебош|явное неуважение)/u.test(clean);
  const format = (article) => article
    ? `${articleLabel(article)} — ${articleHeadline(article, 360)}${article.punishment ? `\nНаказание: ${punishmentText(article.punishment)}` : ''}`
    : '';

  if (physicalHarm && injury) {
    const articles = [injury, ...(systematic && criminal ? [criminal] : [])];
    const extra = systematic && criminal
      ? `\n\nДополнительно могут проверить признаки хулиганства: ${format(criminal)}`
      : '\n\nСам факт драки или нападения не нужно автоматически заменять хулиганством. Для хулиганства нужны отдельные признаки нарушения общественного порядка.';
    return {
      text: `Если были удары или телесные повреждения, основная квалификация по описанию: ${format(injury)}${extra}\n\nТочная квалификация зависит от факта вреда, мотива и систематичности действий.`,
      articles,
      suggestions: ['А если вреда здоровью не было?', 'Когда применяется мелкое хулиганство?', 'Когда хулиганство становится уголовным?'],
    };
  }

  if (systematic && criminal) {
    return {
      text: `Указаны признаки грубого или систематического нарушения порядка, поэтому ближе уголовная норма:\n\n${format(criminal)}\n\nНападение само по себе не является обязательным признаком этой статьи.`,
      articles: [criminal],
      suggestions: ['Чем отличается мелкое хулиганство?', 'А если нарушение было однократным?', 'Что значит систематическое нарушение?'],
    };
  }

  if (minor && petty) {
    return {
      text: `По описанию ближе мелкое хулиганство:\n\n${format(petty)}\n\nДля уголовного хулиганства нужны более серьёзные признаки: грубое систематическое нарушение порядка или игнорирование требований прекратить его.`,
      articles: [petty],
      suggestions: ['Когда это становится уголовным хулиганством?', 'Что считается нарушением порядка?', 'А если была драка?'],
    };
  }

  const variants = [petty, criminal].filter(Boolean);
  return {
    text: `${attackOnly ? 'Одного слова «нападение» недостаточно: нужно знать, были ли удары, вред здоровью, оружие или хищение.\n\n' : ''}По слову «хулиганство» нельзя надёжно выбрать одну статью без обстоятельств.${petty ? `\n\nМелкое хулиганство:\n${format(petty)}` : ''}${criminal ? `\n\nУголовное хулиганство:\n${format(criminal)}` : ''}\n\nУточните: действие было однократным или систематическим, были ли удары, вред и требования прекратить нарушение.`,
    articles: variants,
    suggestions: ['Это было однократно, без драки', 'Он систематически нарушал порядок', 'Он избил человека'],
  };
}

function ambiguousAttackAnswer(clean) {
  const attack = /(напал|нападение)/u.test(clean);
  const decisive = /(избил|ударил|ранил|телесн|вред здоров|оруж|ограб|хищ|украл|отобрал|убил|угрожал)/u.test(clean);
  if (!attack || decisive) return '';
  return 'Слова «напал на человека» недостаточно для точной статьи. Уточните, были ли удары или вред здоровью, применялось ли оружие, были ли угрозы либо попытка забрать имущество. Без этих деталей я не буду приписывать нападению случайную статью.';
}

function assistantIntent(clean) {
  if (/наказан|штраф|срок|тюрьм|розыск|сколько|что будет|что грозит|грозит|карается|посадят|дадут|санкц|ответственност/u.test(clean)) return 'punishment';
  if (/порядок|процедур|действ|как (оформ|провест|задерж|арест|обыск)|что делать/u.test(clean)) return 'procedure';
  if (/сравни|разниц|отлич/u.test(clean)) return 'compare';
  if (/перечисл|список|какие стать|несколько/u.test(clean)) return 'list';
  if (/что такое|что значит|объясни|простыми словами/u.test(clean)) return 'explain';
  return 'general';
}

function retrieveAssistantArticles(source, question, contextualArticles = [], limit = 5, intent = 'general') {
  const clean = normalize(question);
  const violentRobberyQuery = /(ограб|грабеж|разбой)/u.test(clean)
    && !/(без оруж|без насили)/u.test(clean)
    && /(с оруж|насили|угроз|напал|избил|ранил)/u.test(clean);
  const explicitId = clean.match(/(?:стать(?:я|и|ю|е)?\s*)?(\d+(?:\.\d+){0,3})/u)?.[1];
  let concepts = detectedConcepts(clean);
  let tokens = assistantTokens(question);
  const followUp = tokens.length <= 2 && /^(а |и |тогда |в таком случае|наказан|штраф|срок|почему|подробнее|простыми)/u.test(clean);
  const genericFollowUp = !tokens.length || tokens.every((token) => GENERIC_LEGAL_WORDS.has(token));
  if (followUp && contextualArticles.length) {
    if (genericFollowUp) tokens = [...new Set([...tokens, ...assistantTokens(contextualArticles[0].title), ...assistantTokens(contextualArticles[0].description), ...assistantTokens(contextualArticles[0].code)])];
    if (!concepts.length) concepts = detectedConcepts(normalize(`${question} ${contextualArticles[0].title} ${contextualArticles[0].description}`));
  }
  if (!explicitId && !contextualArticles.length && tokens.length > 0 && tokens.every((token) => GENERIC_LEGAL_WORDS.has(token))) return [];
  const ranked = [];
  for (const article of source || []) {
    const document = getDocument(article);
    let score = 0;
    let matched = 0;
    let conceptMatches = 0;
    if (explicitId) {
      const id = document.id.match(/\d+(?:\.\d+){0,3}/u)?.[0] || document.id.replace(/\.$/, '');
      if (id === explicitId) score += 500;
      else if (id.startsWith(`${explicitId}.`)) score += 90;
    }
    for (const token of tokens) {
      const match = bestTokenMatch(token, document);
      if (!match) continue;
      matched += 1;
      score += match.score;
      if (document.title.includes(token)) score += 15;
      if (document.description.includes(token)) score += 12;
      if (document.keywords.includes(token)) score += 7;
      if (document.id.includes(token)) score += 30;
    }
    for (const concept of concepts) {
      const phraseIndexes = concept.phrases.map((phrase, index) => conceptPhraseMatches(phrase, document) ? index : -1).filter((index) => index >= 0);
      const phraseHits = phraseIndexes.length;
      if (phraseHits) {
        conceptMatches += 1;
        score += 115 - phraseIndexes[0] * 12 + (phraseHits - 1) * 18 + (concept.specificity - 1) * 55;
      }
      if (document.category === concept.category) score += phraseHits ? 45 : 8;
      else if (phraseHits === 0) score -= 30;
    }
    score += scenarioScore(clean, document);
    const definitionOnly = /термин|определен|основн.{0,3} понят/u.test(`${document.title} ${document.description.slice(0, 220)}`);
    const rawTitle = String(article.title || '');
    const canonicalTitle = normalize(cleanArticleTitle(rawTitle));
    const metadataOnlyTitle = !canonicalTitle && /[★☆*\[\]()]/u.test(rawTitle);
    const fragmentOnly = /^(?:часть\s*)?\d+[.)]?$/u.test(canonicalTitle)
      || (canonicalTitle.length < 3 && !metadataOnlyTitle)
      || /^(?:f|r|s|ф|р)(?: (?:f|r|s|ф|р))*$/u.test(canonicalTitle);
    if (violentRobberyQuery) {
      const offenceText = `${document.title} ${document.description}`;
      if (/разбой/u.test(offenceText)) score += 180;
      else if (/грабеж/u.test(offenceText)) score -= 55;
    }
    if (concepts.length && intent !== 'explain') {
      score += document.punishment ? 55 : -12;
      if (definitionOnly) score -= 420;
      if (fragmentOnly) score -= 260;
      if (document.description.length > 5000) score -= 45;
    }
    if (intent === 'punishment') score += document.punishment ? 28 : -18;
    const coverage = tokens.length ? matched / tokens.length : 0;
    if (!concepts.length && tokens.length > 2) score -= (tokens.length - matched) * 18;
    if (concepts.length && !conceptMatches) continue;
    const lexicalReliable = matched >= Math.min(2, tokens.length) && coverage >= .6;
    if (score > 0 && (explicitId || conceptMatches || lexicalReliable)) {
      score += coverage * 45;
      if (contextualArticles.some((item) => item.uid === article.uid)) score += genericFollowUp ? 35 : 5;
      ranked.push({ article, score, coverage, conceptMatches });
    }
  }
  const sorted = ranked.sort((a, b) => b.score - a.score || b.conceptMatches - a.conceptMatches || b.coverage - a.coverage);
  const unique = [];
  const seen = new Set();
  for (const item of sorted) {
    const key = [
      normalize(item.article.code),
      normalize(item.article.id),
      normalize(item.article.title),
      normalize(item.article.description),
      normalize(item.article.punishment),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item.article);
    if (unique.length >= limit) break;
  }
  return unique;
}

function retrieveFaq(database, question) {
  const tokens = assistantTokens(question);
  if (!tokens.length) return null;
  return [...(database?.faq || []), ...(database?.faqPk || [])]
    .map((item) => {
      const haystack = normalize(`${item.q} ${item.a}`);
      const matches = tokens.filter((token) => alternatives(token).some((option) => haystack.includes(option))).length;
      const questionMatches = tokens.filter((token) => normalize(item.q).includes(token)).length;
      return { item, score: matches + questionMatches * 2, coverage: matches / tokens.length };
    })
    .filter(({ score, coverage }) => score >= 2 || coverage >= .6)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage)[0]?.item || null;
}

function suggestionsFor(article, intent) {
  if (!article) return ['Как правильно провести задержание?', 'Что будет за незаконное оружие?', 'Объясни мои права при обыске'];
  const values = [];
  if (intent !== 'punishment' && article.punishment) values.push(`Какое наказание по статье ${article.id}?`);
  if (intent !== 'explain') values.push(`Объясни статью ${article.id} простыми словами`);
  values.push(`Покажи похожие статьи на ${article.id}`);
  return values.slice(0, 3);
}

export function buildAssistantAnswer(database, question, context = {}) {
  const clean = normalize(question);
  const concepts = detectedConcepts(clean);
  const details = qualificationDetails(clean);
  const benign = benignSituationAnswer(clean);
  const hooliganism = hooliganismAnswer(database, clean);
  const ambiguousAttack = ambiguousAttackAnswer(clean);
  if (!clean) return { text: 'Напишите вопрос — я сверю его с локальной базой.', articles: [], suggestions: [] };
  if (IDENTITY_QUESTION.test(clean)) return { text: 'Я AI-помощник GOVHelper. Что-то хотели спросить?', articles: [], suggestions: suggestionsFor(null) };
  if (CREATOR_QUESTION.test(clean)) return { text: 'Меня разработал OKOGEXY для GOVHelper. Я помогаю разбирать игровые законы и процедуры Majestic RP по локальной базе.', articles: [], suggestions: suggestionsFor(null) };
  if (VERSION_QUESTION.test(clean)) return { text: 'Сейчас используется GOVHelper v1.0 beta.', articles: [], suggestions: suggestionsFor(null) };
  if (SERVER_QUESTION.test(clean)) return { text: `Сейчас я работаю с базой сервера ${database?.server?.name || 'выбранного в программе'}.`, articles: [], suggestions: suggestionsFor(null) };
  if (CAPABILITIES_QUESTION.test(clean)) return { text: 'Я AI-помощник GOVHelper: понимаю вопросы обычными словами, учитываю контекст беседы, исправляю опечатки и раскладку, нахожу подходящие статьи, наказания и порядок действий. Ответы сверяю только с локальной базой выбранного сервера.', articles: [], suggestions: suggestionsFor(null) };
  if (WELLBEING_QUESTION.test(clean)) return { text: 'Я на связи и готов помочь. Опишите ситуацию или спросите про статью, наказание либо порядок действий.', articles: [], suggestions: suggestionsFor(null) };
  if (FAREWELL.test(clean)) return { text: 'До встречи! Если появится новая ситуация — просто опишите её обычными словами.', articles: [], suggestions: [] };
  if (GREETINGS.test(clean)) return { text: 'Привет! Я готов помочь по законам и процедурам выбранного сервера. Можно описать ситуацию обычными словами — номер статьи знать не обязательно.', articles: [], suggestions: suggestionsFor(null) };
  if (THANKS.test(clean)) return { text: 'Пожалуйста. Если хотите, могу уточнить наказание, порядок действий или найти связанные статьи.', articles: context.articles || [], suggestions: suggestionsFor(context.articles?.[0]) };
  if (benign) return { text: benign, articles: [], suggestions: ['А если музыка была ночью?', 'Что считается нарушением общественного порядка?', 'Когда сотрудник может потребовать прекратить?'] };
  if (hooliganism) return hooliganism;
  if (ambiguousAttack) return { text: ambiguousAttack, articles: [], suggestions: ['Нападавший ударил человека', 'Было оружие и угрозы', 'Он пытался забрать имущество'] };

  const intent = assistantIntent(clean);
  let articles = retrieveAssistantArticles(database?.articles || [], question, context.articles || [], intent === 'compare' || intent === 'list' ? 5 : 4, intent);
  const faq = retrieveFaq(database, question);
  if (!articles.length && !faq) {
    if (/(человек|граждан|сотрудник|водитель|играет|стоит|идет|снимает|говорит|делает)/u.test(clean)) {
      return { text: 'По этому описанию явного состава нарушения в базе не найдено. Сам по себе указанный факт ещё не означает правонарушение. Добавьте важные обстоятельства: время, место, вред, угрозы, оружие, требования сотрудников или помехи окружающим.', articles: [], suggestions: suggestionsFor(null) };
    }
    if (!concepts.length && !/(стать|закон|кодекс|наказ|штраф|арест|задерж|обыск|право|наруш|преступ|ответствен)/u.test(clean)) {
      return { text: 'Я AI-помощник по базе GOVHelper. Лучше всего я отвечаю на вопросы о законах, наказаниях и игровых процедурах. Что-то хотели спросить?', articles: [], suggestions: suggestionsFor(null) };
    }
    return { text: 'Я не нашёл надёжного совпадения в базе этого сервера. Опишите саму ситуацию: кто, что сделал и при каких обстоятельствах — попробую квалифицировать точнее.', articles: [], suggestions: suggestionsFor(null) };
  }

  if (articles.length && concepts.length && !['compare', 'list'].includes(intent)) {
    const primaryCategory = articleCategory(articles[0].code);
    articles = [articles[0], ...articles.slice(1).filter((article) => articleCategory(article.code) === primaryCategory)];
  }
  if (articles.length && !['compare', 'list', 'punishment'].includes(intent)) {
    articles = articles.slice(0, 1);
  }

  const primary = articles[0];
  const parts = [];
  if (faq && (!primary || intent === 'procedure')) parts.push(sentence(faq.a, 650));
  if (primary) {
    if (details.length) parts.push(`Учёл обстоятельства: ${details.join(', ')}.`);
    if (intent === 'compare' || intent === 'list') {
      parts.push(`Нашёл ${articles.length} наиболее подходящих норм:`);
      for (const article of articles) {
        const detail = sentence(article.punishment || article.description || article.title, 230);
        const headline = articleHeadline(article, 240);
        parts.push(`• ${articleLabel(article)}\n${headline}${detail && normalize(detail) !== normalize(headline) ? `\n${detail}` : ''}`);
      }
    } else if (intent === 'punishment') {
      parts.push(`По вашему описанию ближе всего ${articleLabel(primary)} — ${articleHeadline(primary, 360)}`);
      parts.push(primary.punishment ? `Наказание: ${punishmentText(primary.punishment)}` : 'В тексте этой статьи отдельная санкция не указана. Проверьте связанную норму или примечание к разделу.');
      const related = articles.slice(1).filter((article) => {
        if (!article.punishment || articleCategory(article.code) !== articleCategory(primary.code)) return false;
        if (!concepts.length) return true;
        const document = getDocument(article);
        return concepts.some((concept) => concept.phrases.some((phrase) => `${document.title} ${document.description}`.includes(normalize(phrase))));
      }).slice(0, 2);
      if (related.length) {
        parts.push(`Если обстоятельства отличаются, возможна другая квалификация:\n${related.map((article) => `• ${article.id} — ${articleHeadline(article, 220)} Наказание: ${punishmentText(article.punishment)}`).join('\n')}`);
      }
    } else if (intent === 'procedure') {
      parts.push(`Подходящая норма: ${articleLabel(primary)}.`);
      parts.push(sentence(primary.description || primary.title, 650));
      if (primary.punishment) parts.push(`Ответственность: ${punishmentText(primary.punishment)}`);
    } else if (intent === 'explain') {
      parts.push(`${articleLabel(primary)} простыми словами:`);
      parts.push(sentence(primary.description || primary.title, 650));
      if (primary.punishment) parts.push(`За нарушение предусмотрено: ${punishmentText(primary.punishment)}`);
    } else {
      parts.push(`Судя по описанию, речь о ${articleLabel(primary)}.`);
      const headline = articleHeadline(primary, 500);
      parts.push(headline);
      if (primary.description && normalize(primary.description) !== normalize(headline)) parts.push(sentence(primary.description, 550));
      if (primary.punishment) parts.push(`Наказание: ${punishmentText(primary.punishment)}`);
    }
    const related = articles.slice(1).filter((article) => articleCategory(article.code) === articleCategory(primary.code)).slice(0, 2);
    if (related.length && !['compare', 'list', 'punishment'].includes(intent)) parts.push(`Также проверьте ${related.map((article) => article.id).join(' и ')} — квалификация зависит от деталей ситуации.`);
  }
  parts.push('Ответ основан только на локальной базе выбранного сервера.');
  return { text: parts.filter(Boolean).join('\n\n'), articles, suggestions: suggestionsFor(primary, intent) };
}
