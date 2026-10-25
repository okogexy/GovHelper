import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssistantAnswer, searchArticles, swapKeyboard } from '../src/lib/search.js';

const articles = [{
  uid: 'test:1',
  id: '12.8',
  title: 'Незаконное хранение оружия',
  description: 'Лишение свободы за нарушение закона',
  punishment: 'Штраф',
  code: 'Уголовный кодекс',
  keywords: ['огнестрельное'],
}];

const everydayArticles = [
  {
    uid: 'crime:robbery', id: '10.3', title: '★★★ [Федеральная/Региональная]',
    description: 'Грабеж, то есть открытое хищение чужого имущества.', punishment: 'Наказание: 3 года лишения свободы.',
    code: 'Уголовный кодекс', keywords: ['грабеж', 'хищение'],
  },
  {
    uid: 'crime:assault-robbery', id: '10.4', title: '★★★★ [Федеральная/Региональная]',
    description: 'Разбой, то есть нападение в целях хищения чужого имущества с применением насилия.', punishment: 'Наказание: 4 года лишения свободы.',
    code: 'Уголовный кодекс', keywords: ['разбой', 'грабеж'],
  },
  {
    uid: 'crime:carjacking', id: '10.5', title: '★★★ [Федеральная/Региональная]',
    description: 'Неправомерное завладение автомобилем или иным транспортным средством.', punishment: 'Наказание: 3 года лишения свободы.',
    code: 'Уголовный кодекс', keywords: ['угон', 'автомобиль'],
  },
  {
    uid: 'noise:detective', id: '2', title: 'Основные понятия',
    description: 'Оперативное внедрение при расследовании ограбления.', punishment: '',
    code: 'Закон о детективной деятельности', keywords: ['ограбление'],
  },
];

test('smart search handles layout, typo and word forms', () => {
  assert.equal(swapKeyboard('jhe;bt'), 'оружие');
  assert.equal(searchArticles(articles, 'jhe;bt').length, 1);
  assert.equal(searchArticles(articles, 'оружыя').length, 1);
  assert.equal(searchArticles(articles, 'нарушения').length, 1);
});

test('smart search handles exact phrases and exclusions', () => {
  assert.equal(searchArticles(articles, '"лишение свободы"').length, 1);
  assert.equal(searchArticles(articles, 'оружие -штраф').length, 0);
});

test('smart search returns highlight terms', () => {
  const [article] = searchArticles(articles, 'оружие');
  assert.ok(article._searchMatches.includes('оружие'));
});

test('local assistant understands natural questions and explains punishment', () => {
  const answer = buildAssistantAnswer({ articles, faq: [], faqPk: [] }, 'Что будет за незаконное оружие?');
  assert.match(answer.text, /12\.8/);
  assert.match(answer.text, /Наказание: Штраф/);
  assert.equal(answer.articles[0].uid, 'test:1');
  assert.ok(answer.suggestions.length > 0);
});

test('local assistant keeps article context in follow-up questions', () => {
  const answer = buildAssistantAnswer({ articles, faq: [], faqPk: [] }, 'А какое наказание?', { articles });
  assert.match(answer.text, /Штраф/);
  assert.equal(answer.articles[0].id, '12.8');
});

test('local assistant responds conversationally without inventing laws', () => {
  assert.match(buildAssistantAnswer({ articles: [] }, 'Привет').text, /Привет/);
  const unknown = buildAssistantAnswer({ articles, faq: [], faqPk: [] }, 'квантовый телепортатор');
  assert.equal(unknown.articles.length, 0);
  assert.match(unknown.text, /AI-помощник/);
});

test('local assistant introduces itself and handles natural small talk', () => {
  for (const question of ['Ты кто?', 'Что ты такое?', 'Ты бот?', 'Как тебя зовут?']) {
    const answer = buildAssistantAnswer({ articles: [] }, question);
    assert.match(answer.text, /Я AI-помощник GOVHelper/);
    assert.match(answer.text, /Что-то хотели спросить/);
  }
  assert.match(buildAssistantAnswer({ articles: [] }, 'Ты тут?').text, /на связи/);
  assert.match(buildAssistantAnswer({ articles: [] }, 'Какая версия программы?').text, /v1\.0 beta/);
});

test('local assistant maps everyday robbery wording to the criminal rule', () => {
  const answer = buildAssistantAnswer({ articles: everydayArticles }, 'Что грозит за ограбление?');
  assert.equal(answer.articles[0].uid, 'crime:robbery');
  assert.match(answer.text, /10\.3/);
  assert.match(answer.text, /3 года лишения свободы/);
  assert.doesNotMatch(answer.text, /Наказание: Наказание:/);
});

test('local assistant distinguishes robbery with violence or a weapon', () => {
  const direct = buildAssistantAnswer({ articles: everydayArticles }, 'Что грозит за ограбление с оружием?');
  assert.equal(direct.articles[0].uid, 'crime:assault-robbery');
  const followUp = buildAssistantAnswer({ articles: everydayArticles }, 'А если с оружием?', { articles: [everydayArticles[0]] });
  assert.equal(followUp.articles[0].uid, 'crime:assault-robbery');
});

test('local assistant understands car theft phrased in different ways', () => {
  for (const question of ['Что грозит за угон?', 'Что дадут, если украл машину?', 'Наказание за автоугон']) {
    const answer = buildAssistantAnswer({ articles: everydayArticles }, question);
    assert.equal(answer.articles[0].uid, 'crime:carjacking');
    assert.match(answer.text, /10\.5/);
  }
});

test('local assistant rejects an unrelated mention when no criminal norm exists', () => {
  const answer = buildAssistantAnswer({ articles: [everydayArticles[3]] }, 'Что грозит за ограбление?');
  assert.equal(answer.articles.length, 0);
  assert.match(answer.text, /не нашёл надёжного совпадения/);
});

test('local assistant prefers an actual offence over a definitions article', () => {
  const definition = {
    uid: 'crime:definitions', id: '1.5', title: 'Термины и определения',
    description: 'Разбой, грабеж, оружие и другие термины кодекса.', punishment: '',
    code: 'Уголовный кодекс', keywords: ['разбой', 'оружие'],
  };
  const answer = buildAssistantAnswer({ articles: [definition, ...everydayArticles] }, 'Ограбил человека с оружием');
  assert.equal(answer.articles[0].uid, 'crime:assault-robbery');
});

test('local assistant understands search and detention procedure wording', () => {
  const procedure = [{
    uid: 'procedure:search', id: '3.2', title: 'Порядок проведения обыска',
    description: 'Личный обыск проводится при наличии предусмотренных законом оснований.', punishment: '',
    code: 'Процессуальный кодекс', keywords: ['обыск', 'досмотр'],
  }];
  const answer = buildAssistantAnswer({ articles: procedure }, 'Можно ли провести обыск без ордера?');
  assert.equal(answer.articles[0].uid, 'procedure:search');
});

test('local assistant distinguishes giving and receiving a bribe', () => {
  const bribery = [
    { uid: 'bribe:receive', id: '15.4', title: 'Получение взятки', description: 'Получение должностным лицом незаконного вознаграждения.', punishment: '5 лет', code: 'Уголовный кодекс', keywords: ['взятка'] },
    { uid: 'bribe:give', id: '15.5', title: 'Дача взятки', description: 'Передача должностному лицу незаконного вознаграждения.', punishment: '4 года', code: 'Уголовный кодекс', keywords: ['взятка'] },
  ];
  assert.equal(buildAssistantAnswer({ articles: bribery }, 'Что грозит, если дал взятку?').articles[0].uid, 'bribe:give');
  assert.equal(buildAssistantAnswer({ articles: bribery }, 'Что грозит сотруднику, который получил взятку?').articles[0].uid, 'bribe:receive');
});

test('local assistant distinguishes drug sale from possession', () => {
  const drugs = [
    { uid: 'drugs:store', id: '13.2', title: 'Незаконное хранение наркотических веществ', description: 'Хранение и перевозка наркотических веществ.', punishment: '2 года', code: 'Уголовный кодекс', keywords: ['наркотики'] },
    { uid: 'drugs:sale', id: '13.7', title: 'Незаконный сбыт наркотических средств', description: 'Сбыт и распространение наркотических средств.', punishment: '5 лет', code: 'Уголовный кодекс', keywords: ['наркотики'] },
  ];
  assert.equal(buildAssistantAnswer({ articles: drugs }, 'Что грозит, если продал наркотики?').articles[0].uid, 'drugs:sale');
  assert.equal(buildAssistantAnswer({ articles: drugs }, 'Что будет, если хранил наркотики?').articles[0].uid, 'drugs:store');
});

test('local assistant removes duplicate article fragments and explains considered details', () => {
  const duplicate = { ...everydayArticles[1], uid: 'crime:assault-robbery-fragment', title: '1' };
  const answer = buildAssistantAnswer({ articles: [duplicate, ...everydayArticles] }, 'Ограбил человека с оружием и применил насилие');
  assert.equal(answer.articles.filter((article) => article.id === '10.4').length, 1);
  assert.match(answer.text, /Учёл обстоятельства: оружие, насилие/);
});

test('local assistant does not invent an offence for playing guitar in public', () => {
  const misleading = [{
    uid: 'crime:insult', id: '17.9', title: 'Грубое неоднократное оскорбление',
    description: 'Грубое и неоднократное оскорбление человека в общественном месте в присутствии представителя власти.',
    punishment: 'До 10 месяцев лишения свободы.', code: 'Уголовный кодекс', keywords: ['общественное место'],
  }];
  const answer = buildAssistantAnswer({ articles: misleading }, 'Человек играет на гитаре в общественном месте');
  assert.equal(answer.articles.length, 0);
  assert.match(answer.text, /Само по себе исполнение музыки|не указывает на нарушение/);
  assert.doesNotMatch(answer.text, /17\.9/);
});

test('local assistant distinguishes harmless music from nighttime noise', () => {
  const publicOrder = [{
    uid: 'admin:night-music', id: '5.6', title: 'Громкая музыка в ночное время',
    description: 'Громкие выкрикивания, включение музыки в ночное время суток с 22:00 до 08:00.',
    punishment: 'Штраф до 15.000$.', code: 'Административный кодекс', keywords: ['тишина', 'музыка'],
  }, {
    uid: 'law:night-status', id: '1.6', title: 'Статус территории ночью',
    description: 'Общий режим территории в ночное время суток.', punishment: '', code: 'Закон о территориях', keywords: ['ночь'],
  }];
  const answer = buildAssistantAnswer({ articles: publicOrder }, 'Человек громко играет на гитаре ночью и мешает спать');
  assert.equal(answer.articles[0].uid, 'admin:night-music');
  assert.equal(answer.articles.length, 1);
  assert.match(answer.text, /5\.6/);
});

test('local assistant still finds a real public insult when the action is stated', () => {
  const insult = [{
    uid: 'crime:insult', id: '17.9', title: 'Грубое неоднократное оскорбление',
    description: 'Грубое и неоднократное оскорбление человека в общественном месте.',
    punishment: 'До 10 месяцев лишения свободы.', code: 'Уголовный кодекс', keywords: ['оскорбление'],
  }];
  const answer = buildAssistantAnswer({ articles: insult }, 'Грубо и неоднократно оскорбил человека в общественном месте');
  assert.equal(answer.articles[0].uid, 'crime:insult');
});

const hooliganArticles = [
  {
    uid: 'admin:petty-hooligan', id: '5.9', title: 'Мелкое хулиганство',
    description: 'Нарушение общественного порядка, нецензурные жесты и явное неуважение к обществу.',
    punishment: 'Штраф до 20.000$.', code: 'Административный кодекс', keywords: ['хулиганство'],
  },
  {
    uid: 'crime:hooligan', id: '12.6', title: 'Хулиганство, грубое систематическое нарушение общественного порядка',
    description: 'Грубое систематическое нарушение порядка или игнорирование требований прекратить нарушение.',
    punishment: 'До 20 месяцев лишения свободы.', code: 'Уголовный кодекс', keywords: ['хулиганство'],
  },
  {
    uid: 'crime:injury', id: '6.1', title: 'Умышленное нанесение телесных повреждений',
    description: 'Умышленное нанесение телесных повреждений лёгкой или средней тяжести.',
    punishment: 'До 20 месяцев лишения свободы.', code: 'Уголовный кодекс', keywords: ['избил', 'телесные повреждения'],
  },
  {
    uid: 'crime:animal-injury', id: '6.8', title: 'Нанесение телесных повреждений животному',
    description: 'Умышленное нанесение телесных повреждений животному.',
    punishment: 'До 20 месяцев лишения свободы.', code: 'Уголовный кодекс', keywords: ['животное', 'телесные повреждения'],
  },
];

test('local assistant does not replace generic hooliganism with assault', () => {
  const answer = buildAssistantAnswer({ articles: hooliganArticles }, 'Что грозит за хулиганство?');
  assert.deepEqual(answer.articles.map((article) => article.uid), ['admin:petty-hooligan', 'crime:hooligan']);
  assert.match(answer.text, /нельзя надёжно выбрать одну статью/);
  assert.doesNotMatch(answer.text, /основная квалификация.*6\.1/s);
});

test('local assistant separates bodily harm from hooliganism', () => {
  const answer = buildAssistantAnswer({ articles: hooliganArticles }, 'Хулиган избил человека');
  assert.equal(answer.articles[0].uid, 'crime:injury');
  assert.match(answer.text, /Сам факт драки или нападения не нужно автоматически заменять хулиганством/);
});

test('local assistant distinguishes petty and systematic hooliganism', () => {
  const petty = buildAssistantAnswer({ articles: hooliganArticles }, 'Мелкое хулиганство: показывал нецензурные жесты');
  assert.deepEqual(petty.articles.map((article) => article.uid), ['admin:petty-hooligan']);
  const criminal = buildAssistantAnswer({ articles: hooliganArticles }, 'Грубое систематическое хулиганство, игнорировал требования прекратить');
  assert.deepEqual(criminal.articles.map((article) => article.uid), ['crime:hooligan']);
});

test('local assistant asks for facts when only an attack is mentioned', () => {
  const answer = buildAssistantAnswer({ articles: hooliganArticles }, 'Человек напал на другого человека');
  assert.equal(answer.articles.length, 0);
  assert.match(answer.text, /недостаточно для точной статьи/);
});

test('local assistant does not confuse a human victim with an animal', () => {
  const answer = buildAssistantAnswer({ articles: hooliganArticles }, 'Человек избил другого человека');
  assert.equal(answer.articles[0].uid, 'crime:injury');
  assert.equal(answer.articles.length, 1);
  assert.equal(answer.articles.some((article) => article.uid === 'crime:animal-injury'), false);
});

test('local assistant keeps distinct source articles with the same number', () => {
  const sameNumber = [
    {
      uid: 'weapon:store', id: '12.8', title: 'Незаконное хранение оружия',
      description: 'Незаконное хранение огнестрельного оружия.', punishment: 'До 20 месяцев.',
      code: 'Уголовный кодекс', keywords: ['оружие'],
    },
    {
      uid: 'weapon:carry', id: '12.8', title: 'Незаконное ношение оружия',
      description: 'Незаконное ношение огнестрельного оружия.', punishment: 'До 15 месяцев.',
      code: 'Уголовный кодекс', keywords: ['оружие'],
    },
  ];
  const answer = buildAssistantAnswer({ articles: sameNumber }, 'Перечисли статьи про незаконное оружие');
  assert.deepEqual(answer.articles.map((article) => article.uid), ['weapon:store', 'weapon:carry']);
});

test('local assistant uses the source description when title contains only badges', () => {
  const article = {
    uid: 'weapon:badge', id: '12.8', title: '★★★★ [F/R/S]',
    description: 'Незаконное хранение огнестрельного оружия без лицензии.',
    punishment: 'До 20 месяцев.', code: 'Уголовный кодекс', keywords: ['оружие'],
  };
  const answer = buildAssistantAnswer({ articles: [article] }, 'Что грозит за незаконное оружие?');
  assert.match(answer.text, /Незаконное хранение огнестрельного оружия без лицензии/);
  assert.doesNotMatch(answer.text, /F\/R\/S/);
});
