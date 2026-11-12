const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/quill-assistant.js', 'utf8');
const start = source.indexOf('function normalizeAnswerText');
const end = source.indexOf('// 4. React Fiber Auto-Fill');
const helperCode = source.slice(start, end) + `
this.classifyQuestion = classifyQuestion;
this.extractMarkedAnswer = extractMarkedAnswer;
this.extractBlankAnswers = extractBlankAnswers;
this.canonicalizeBlankAnswers = canonicalizeBlankAnswers;
this.extractBlankAnswer = extractBlankAnswer;
this.questionMatchScore = questionMatchScore;
this.getRouteInfo = getRouteInfo;
`;

const context = { URLSearchParams };
vm.createContext(context);
vm.runInContext(helperCode, context);

assert.strictEqual(
  context.classifyQuestion('connect_fill_in_the_blank', 'The ___ journal was full.'),
  'fill-blank'
);
assert.strictEqual(
  context.extractMarkedAnswer('Corn snakes are {friendly and} easy to hold, so they are common pet snakes.'),
  'friendly and'
);
assert.strictEqual(
  context.extractBlankAnswer(
    'The ___ journal was full of ideas for her next book series.',
    "The author's journal was full of ideas for her next book series."
  ),
  "author's"
);
assert.strictEqual(
  context.extractBlankAnswer(
    "Many sea snakes are very ___ don't always release venom when they bite.",
    "Many sea snakes are very Venomous but don't always release venom when they bite."
  ),
  'Venomous but'
);
assert.strictEqual(
  context.extractBlankAnswer(
    'Corn snakes are ___ easy to hold, so they&#x27;re common pet snakes.',
    "Corn snakes are friendly and easy to hold, so they're common pet snakes."
  ),
  'friendly and'
);
assert.strictEqual(
  context.extractBlankAnswer('The ___ and ___ journal.', 'The author and editor journal.'),
  null
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.extractBlankAnswers(
    'Snakes use their forked tongues to help them smell ___ find prey, like mice ___ rats.',
    'Snakes use their forked tongues to help them smell and find prey, like mice And rats.'
  ))),
  ['and', 'And']
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.canonicalizeBlankAnswers(
    [', and', 'And'],
    ['and', ', and']
  ))),
  [', and', 'and']
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.extractBlankAnswers(
    "Brazilian rainbow boas' scales create a rainbow effect ___ blue Malayan coral snakes have blue stripes ___ a bright red head.",
    "Brazilian rainbow boas' scales create a rainbow effect , and blue Malayan coral snakes have blue stripes and a bright red head."
  ))),
  [', and', 'and']
);
assert.strictEqual(
  context.classifyQuestion('connect_sentence_combining', 'Combine the sentences.'),
  'full-response'
);
assert.strictEqual(
  JSON.stringify(context.getRouteInfo('https://www.quill.org/connect/#/play/lesson/-KnoWhUWhtxvet4_bi4r')),
  JSON.stringify({ mode: 'connect', lessonId: '-KnoWhUWhtxvet4_bi4r' })
);
assert.strictEqual(
  JSON.stringify(context.getRouteInfo('https://www.quill.org/grammar/#/play/sw/?activities=3&uid=-LJKkIquxzIw_2BRkT6f')),
  JSON.stringify({ mode: 'grammar', lessonId: '-LJKkIquxzIw_2BRkT6f' })
);
assert.strictEqual(
  context.questionMatchScore('The ___ journal was full of ideas.', 'The ___ journal was full of ideas for her next book series.'),
  1
);

const standaloneBookmarklet = fs.readFileSync('dist/bookmarklet-standalone.txt', 'utf8').trim();
const standaloneCode = decodeURI(standaloneBookmarklet).replace(/^javascript:/, '');
assert.doesNotThrow(() => new vm.Script(standaloneCode), 'generated standalone bookmarklet must parse');

console.log('fill-answer tests passed');
