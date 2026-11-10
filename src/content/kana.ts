import { Lesson, Step } from './types';

/** [平假名, 片假名, 羅馬拼音, 平假名字源, 片假名字源] */
type K = [string, string, string, string, string];

export const kanaRows: { row: string; kana: K[] }[] = [
  { row: 'あ行', kana: [['あ','ア','a','安','阿'],['い','イ','i','以','伊'],['う','ウ','u','宇','宇'],['え','エ','e','衣','江'],['お','オ','o','於','於']] },
  { row: 'か行', kana: [['か','カ','ka','加','加'],['き','キ','ki','幾','幾'],['く','ク','ku','久','久'],['け','ケ','ke','計','介'],['こ','コ','ko','己','己']] },
  { row: 'さ行', kana: [['さ','サ','sa','左','散'],['し','シ','shi','之','之'],['す','ス','su','寸','須'],['せ','セ','se','世','世'],['そ','ソ','so','曽','曽']] },
  { row: 'た行', kana: [['た','タ','ta','太','多'],['ち','チ','chi','知','千'],['つ','ツ','tsu','川','川'],['て','テ','te','天','天'],['と','ト','to','止','止']] },
  { row: 'な行', kana: [['な','ナ','na','奈','奈'],['に','ニ','ni','仁','仁'],['ぬ','ヌ','nu','奴','奴'],['ね','ネ','ne','祢','祢'],['の','ノ','no','乃','乃']] },
  { row: 'は行', kana: [['は','ハ','ha','波','八'],['ひ','ヒ','hi','比','比'],['ふ','フ','fu','不','不'],['へ','ヘ','he','部','部'],['ほ','ホ','ho','保','保']] },
  { row: 'ま行', kana: [['ま','マ','ma','末','末'],['み','ミ','mi','美','三'],['む','ム','mu','武','牟'],['め','メ','me','女','女'],['も','モ','mo','毛','毛']] },
  { row: 'や行', kana: [['や','ヤ','ya','也','也'],['ゆ','ユ','yu','由','由'],['よ','ヨ','yo','与','与']] },
  { row: 'ら行', kana: [['ら','ラ','ra','良','良'],['り','リ','ri','利','利'],['る','ル','ru','留','流'],['れ','レ','re','礼','礼'],['ろ','ロ','ro','呂','呂']] },
  { row: 'わ行', kana: [['わ','ワ','wa','和','和'],['を','ヲ','o (wo)','遠','乎'],['ん','ン','n','无','']] },
];

/** 依字元決定的洗牌，讓每次產生的題目一致 */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function choiceFor(k: K, pool: K[], script: 0 | 1, reverse: boolean, seed: number): Step {
  const rand = seeded(seed);
  const others = pool.filter(p => p[2] !== k[2]).sort(() => rand() - 0.5).slice(0, 2);
  const all = [k, ...others].sort(() => rand() - 0.5);
  const answer = all.indexOf(k);
  const char = k[script];
  if (reverse) {
    return {
      type: 'choice', label: '辨識假名', line: k[2], question: `哪一個是「${k[2]}」？`,
      options: all.map(o => ({ text: o[script], hint: `這是「${o[2]}」` })),
      answer, explain: `「${char}」念 ${k[2]}。`,
    };
  }
  return {
    type: 'choice', label: '聽音辨字', line: char, speak: char, question: '這個假名怎麼念？',
    options: all.map(o => ({ text: o[2], hint: `「${o[2]}」是「${o[script]}」` })),
    answer, explain: `「${char}」念 ${k[2]}${k[3 + script] ? `，字源是「${k[3 + script]}」` : ''}。`,
  };
}

function buildKanaLessons(script: 0 | 1): Lesson[] {
  const name = script === 0 ? '平假名' : '片假名';
  const groups = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
  return groups.map((g, gi) => {
    const rows = g.map(i => kanaRows[i]);
    const pool = rows.flatMap(r => r.kana);
    const steps: Step[] = [];
    rows.forEach((r, ri) => {
      r.kana.forEach(k => steps.push({
        type: 'learn', ja: k[script], reading: k[2], zh: `${r.row}`,
        note: k[3 + script] ? `字源：「${k[3 + script]}」，用漢字聯想更好記` : undefined,
      }));
      r.kana.forEach((k, ki) => steps.push(choiceFor(k, pool, script, false, (gi + 1) * 100 + ri * 10 + ki)));
    });
    // 混合複習：反向題
    pool.slice(0, 4).forEach((k, ki) => steps.push(choiceFor(k, pool, script, true, (gi + 1) * 1000 + ki)));
    return {
      id: `kana-${script === 0 ? 'h' : 'k'}-${gi + 1}`,
      title: `${name}：${rows.map(r => r.row).join('、')}`,
      subtitle: rows.map(r => r.kana.map(k => k[script]).join('')).join(' · '),
      kind: 'kana' as const,
      minutes: 4,
      steps,
    };
  });
}

export const hiraganaLessons = buildKanaLessons(0);
export const katakanaLessons = buildKanaLessons(1);

const ask = '這個字是什麼意思？';
export const travelKatakana: Lesson = {
  id: 'vocab-katakana-travel',
  title: '旅途中的片假名',
  subtitle: '菜單、招牌最常見的外來語',
  kind: 'vocab',
  minutes: 3,
  steps: [
    { type: 'learn', ja: 'ラーメン', reading: 'raamen', zh: '拉麵', note: '長音「ー」要拉長發音' },
    { type: 'learn', ja: 'コンビニ', reading: 'konbini', zh: '便利商店', note: '來自 convenience store' },
    { type: 'learn', ja: 'タクシー', reading: 'takushii', zh: '計程車' },
    { type: 'choice', label: '菜單', line: 'コーヒー', speak: 'コーヒー', question: ask,
      options: [{ text: '可樂' }, { text: '咖啡' }, { text: '果汁' }], answer: 1, explain: 'コーヒー（koohii）＝咖啡，有兩個長音。' },
    { type: 'choice', label: '招牌', line: 'ホテル', speak: 'ホテル', question: ask,
      options: [{ text: '醫院' }, { text: '車站' }, { text: '飯店' }], answer: 2, explain: 'ホテル（hoteru）＝飯店。' },
    { type: 'choice', label: '標示', line: 'トイレ', speak: 'トイレ', question: ask,
      options: [{ text: '廁所' }, { text: '電視' }, { text: '出口' }], answer: 0, explain: 'トイレ（toire）來自 toilet。' },
    { type: 'choice', label: '菜單', line: 'ラーメン', speak: 'ラーメン', question: ask,
      options: [{ text: '咖哩' }, { text: '拉麵' }, { text: '壽司' }], answer: 1, explain: 'ラーメン＝拉麵。' },
    { type: 'choice', label: '乘車處', line: 'タクシー', speak: 'タクシー', question: ask,
      options: [{ text: '計程車' }, { text: '巴士' }, { text: '電車' }], answer: 0, explain: 'タクシー＝計程車，巴士是バス。' },
  ],
};

export const signsLesson: Lesson = {
  id: 'vocab-signs',
  title: '車站招牌與漢字陷阱',
  subtitle: '中日同字不同義',
  kind: 'vocab',
  minutes: 3,
  steps: [
    { type: 'learn', ja: '出口', reading: 'でぐち', zh: '出口', note: '跟中文一樣' },
    { type: 'learn', ja: '改札', reading: 'かいさつ', zh: '剪票口', note: '刷 Suica 進出站的地方' },
    { type: 'learn', ja: '大丈夫', reading: 'だいじょうぶ', zh: '沒問題、不用了', note: '不是「男子漢」' },
    { type: 'learn', ja: '手紙', reading: 'てがみ', zh: '信', note: '衛生紙是ティッシュ' },
    { type: 'choice', label: '新宿站', line: '你要刷卡進站。', question: '要找哪個招牌？',
      options: [{ text: '出口', hint: '這是出口' }, { text: '改札' }, { text: '乗り場', hint: '乗り場（のりば）是搭乘處' }], answer: 1,
      explain: '改札（かいさつ）＝剪票口。' },
    { type: 'choice', label: '車站內', line: '你想找廁所。', question: '要找哪個標示？',
      options: [{ text: '精算機', hint: '精算機（せいさんき）是補票機' }, { text: 'お手洗い' }, { text: '乗り場', hint: '這是搭乘處' }], answer: 1,
      explain: 'お手洗い（おてあらい）＝廁所。' },
    { type: 'choice', label: '漢字陷阱', line: '大丈夫です', speak: '大丈夫です', question: '日本人這樣說，意思是？',
      options: [{ text: '沒問題、不用了' }, { text: '他是男子漢', hint: '跟中文意思不一樣喔' }, { text: '很大', hint: '跟中文意思不一樣喔' }], answer: 0,
      explain: '大丈夫です＝沒問題，也常用來委婉拒絕。' },
    { type: 'choice', label: '漢字陷阱', line: '手紙', speak: '手紙', question: '這個詞是什麼？',
      options: [{ text: '衛生紙', hint: '衛生紙是ティッシュ' }, { text: '手套', hint: '手套是手袋（てぶくろ）' }, { text: '信' }], answer: 2,
      explain: '手紙（てがみ）＝信件。' },
  ],
};

/**
 * 濁音・半濁音。和 `kanaRows` 分開放，是因為那份是「五十音表」本身的語意
 * （畫面上的 10×5 格），濁音拗音是加在它旁邊的另外兩張表。
 * 字源欄留空：濁音只是在清音上加兩點，沒有獨立的萬葉假名來源可以聯想。
 *
 * 羅馬拼音不能重複：ぢ／づ 和 じ／ず 同音，但 `choiceFor` 用拼音當身分
 * （過濾選項、React key），寫成一樣的會互相吃掉。
 */
export const dakutenRows: { row: string; kana: K[] }[] = [
  { row: 'が行', kana: [['が','ガ','ga','',''],['ぎ','ギ','gi','',''],['ぐ','グ','gu','',''],['げ','ゲ','ge','',''],['ご','ゴ','go','','']] },
  { row: 'ざ行', kana: [['ざ','ザ','za','',''],['じ','ジ','ji','',''],['ず','ズ','zu','',''],['ぜ','ゼ','ze','',''],['ぞ','ゾ','zo','','']] },
  { row: 'だ行', kana: [['だ','ダ','da','',''],['ぢ','ヂ','ji (di)','',''],['づ','ヅ','zu (du)','',''],['で','デ','de','',''],['ど','ド','do','','']] },
  { row: 'ば行', kana: [['ば','バ','ba','',''],['び','ビ','bi','',''],['ぶ','ブ','bu','',''],['べ','ベ','be','',''],['ぼ','ボ','bo','','']] },
  { row: 'ぱ行', kana: [['ぱ','パ','pa','',''],['ぴ','ピ','pi','',''],['ぷ','プ','pu','',''],['ぺ','ペ','pe','',''],['ぽ','ポ','po','','']] },
];

/** 拗音。行名只給母音那個清音字（「きゃ行」在 34pt 的欄寬會換行） */
export const yoonRows: { row: string; kana: K[] }[] = [
  { row: 'き', kana: [['きゃ','キャ','kya','',''],['きゅ','キュ','kyu','',''],['きょ','キョ','kyo','','']] },
  { row: 'し', kana: [['しゃ','シャ','sha','',''],['しゅ','シュ','shu','',''],['しょ','ショ','sho','','']] },
  { row: 'ち', kana: [['ちゃ','チャ','cha','',''],['ちゅ','チュ','chu','',''],['ちょ','チョ','cho','','']] },
  { row: 'に', kana: [['にゃ','ニャ','nya','',''],['にゅ','ニュ','nyu','',''],['にょ','ニョ','nyo','','']] },
  { row: 'ひ', kana: [['ひゃ','ヒャ','hya','',''],['ひゅ','ヒュ','hyu','',''],['ひょ','ヒョ','hyo','','']] },
  { row: 'み', kana: [['みゃ','ミャ','mya','',''],['みゅ','ミュ','myu','',''],['みょ','ミョ','myo','','']] },
  { row: 'り', kana: [['りゃ','リャ','rya','',''],['りゅ','リュ','ryu','',''],['りょ','リョ','ryo','','']] },
  { row: 'ぎ', kana: [['ぎゃ','ギャ','gya','',''],['ぎゅ','ギュ','gyu','',''],['ぎょ','ギョ','gyo','','']] },
  { row: 'じ', kana: [['じゃ','ジャ','ja','',''],['じゅ','ジュ','ju','',''],['じょ','ジョ','jo','','']] },
  { row: 'び', kana: [['びゃ','ビャ','bya','',''],['びゅ','ビュ','byu','',''],['びょ','ビョ','byo','','']] },
  { row: 'ぴ', kana: [['ぴゃ','ピャ','pya','',''],['ぴゅ','ピュ','pyu','',''],['ぴょ','ピョ','pyo','','']] },
];

/**
 * 濁音和拗音的課，用和清音同一套 learn→choice 的節奏，但**要分堂切小**：
 * 濁音半濁音 25 個、拗音 33 個，一堂塞完是 50 個以上的 step，
 * 中途離開就等於整堂重來。
 */
function buildExtraLessons(
  rows: { row: string; kana: K[] }[], groups: number[][], script: 0 | 1,
  idPrefix: string, label: string, noteFor: (row: string) => string,
): Lesson[] {
  const name = script === 0 ? '平假名' : '片假名';
  return groups.map((g, gi) => {
    const rs = g.map(i => rows[i]);
    const pool = rs.flatMap(r => r.kana);
    const steps: Step[] = [];
    rs.forEach((r, ri) => {
      r.kana.forEach(k => steps.push({
        // zh 這一欄在假名課是「這個字屬於哪一行」，不是字義
        type: 'learn', ja: k[script], reading: k[2], zh: label === '拗音' ? `${r.row}＋小字` : r.row, note: noteFor(r.row),
      }));
      r.kana.forEach((k, ki) => steps.push(choiceFor(k, pool, script, false, (gi + 1) * 100 + ri * 10 + ki)));
    });
    pool.slice(0, 4).forEach((k, ki) => steps.push(choiceFor(k, pool, script, true, (gi + 1) * 1000 + ki)));
    return {
      id: `${idPrefix}-${script === 0 ? 'h' : 'k'}-${gi + 1}`,
      // 行名逐個寫成「だ行、ば行、ぱ行」會超出單行列表的寬度被截掉，只留最後一個「行」
      title: `${name}${label}：${rs.map(r => r.row.replace('行', '')).join('・')}${rs[0].row.endsWith('行') ? '行' : ''}`,
      subtitle: rs.map(r => r.kana.map(k => k[script]).join('')).join(' · '),
      kind: 'kana' as const,
      minutes: 4,
      steps,
    };
  });
}

const dakutenNote = (row: string) =>
  row === 'ぱ行'
    ? 'は行右上加一個圈（半濁點），念 p'
    : `${row[0]} 是${row === 'が行' ? 'か' : row === 'ざ行' ? 'さ' : row === 'だ行' ? 'た' : 'は'}行右上加兩點（濁點），聲帶要振動`;

const yoonNote = (row: string) => `${row} ＋ 小寫的 や/ゆ/よ，兩個字拼成一個音節，不要念成兩拍`;

export const dakutenLessons = (script: 0 | 1) =>
  buildExtraLessons(dakutenRows, [[0, 1], [2, 3, 4]], script, 'kana-d', '濁音', dakutenNote);

export const yoonLessons = (script: 0 | 1) =>
  buildExtraLessons(yoonRows, [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9, 10]], script, 'kana-y', '拗音', yoonNote);

/**
 * 促音和長音沒有自己的字可以認，只能用「差一拍就是另一個字」的對比題教——
 * 這也是台灣人最容易漏掉的兩個音，中文沒有用長度區分意義的習慣。
 */
export const rhythmLesson: Lesson = {
  id: 'kana-rhythm',
  title: '拍子：停一拍、拉長一拍',
  subtitle: 'きって／きて、おばさん／おばあさん',
  kind: 'kana',
  minutes: 4,
  steps: [
    { type: 'learn', ja: 'っ', reading: '促音', zh: '停一拍不發音', note: '寫成小一號的「つ」，自己佔一拍：きって 是 ki-t-te 三拍' },
    { type: 'learn', ja: 'きって', reading: 'きって', zh: '郵票', note: '和「きて（請過來）」只差那一拍' },
    { type: 'learn', ja: 'ー', reading: '長音', zh: '把前一個母音拉長一拍', note: '片假名用「ー」，平假名用多寫一個母音：おばあさん、こうこう' },
    { type: 'learn', ja: 'ラーメン', reading: 'raamen', zh: '拉麵', note: 'ra-a-me-n 四拍，念成三拍日本人會聽不懂' },
    { type: 'choice', label: '促音', line: '郵便局で「切手」を買います。', lineZh: '在郵局買郵票。',
      question: '「郵票」的讀音是哪一個？', speak: 'きって',
      options: [{ text: 'きて', hint: 'きて是「請過來」' }, { text: 'きって' }, { text: 'きいて', hint: 'きいて是「請聽」' }], answer: 1,
      explain: 'きって（切手）＝郵票。小さい「っ」要停一拍，少了就變成「きて（請過來）」。' },
    { type: 'choice', label: '促音', line: 'がっこう', speak: 'がっこう', question: '這個詞有幾拍？',
      options: [{ text: '三拍', hint: '「っ」和長音各自佔一拍' }, { text: '四拍' }, { text: '五拍' }], answer: 1,
      explain: 'ga-k-ko-o 四拍。「っ」算一拍，「こう」的 u 也算一拍。' },
    { type: 'choice', label: '長音', line: '伯母／お祖母', question: '「奶奶」是哪一個？', speak: 'おばあさん',
      options: [{ text: 'おばさん', hint: 'おばさん是阿姨、伯母' }, { text: 'おばあさん' }, { text: 'おっばさん', hint: '沒有這個詞' }], answer: 1,
      explain: 'おばあさん＝奶奶、老太太；おばさん＝阿姨。差一拍就差一個輩分，叫錯會失禮。' },
    { type: 'choice', label: '長音', line: 'ビール／ビル', question: '「啤酒」是哪一個？', speak: 'ビール',
      options: [{ text: 'ビール' }, { text: 'ビル', hint: 'ビル是大樓' }, { text: 'ビッル', hint: '沒有這個詞' }], answer: 0,
      explain: 'ビール＝啤酒，ビル＝大樓。片假名的長音一律寫「ー」。' },
    { type: 'choice', label: '長音', line: '這個字怎麼念？', speak: 'こうこう', question: '「高校（高中）」的讀音是？',
      options: [{ text: 'ここ', hint: 'ここ是「這裡」' }, { text: 'こうこう' }, { text: 'こっこ', hint: '沒有這個詞' }], answer: 1,
      explain: 'こうこう。平假名的長音靠多寫一個母音表示，o 的長音通常寫成「う」。' },
  ],
};
