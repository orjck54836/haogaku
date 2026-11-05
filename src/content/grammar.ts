import { Lesson, Unit } from './types';

/**
 * 基本文法介紹（初級）。
 *
 * ## 為什麼是手寫而不是產生的
 *
 * 文法和五十音一樣是**封閉的知識**——「は」和「が」的差別不會因為情境換了就不同，
 * 產生出來的版本每次用字不一樣反而讓人以為規則有兩套。
 * 而且這是初級的人最早會卡住的地方，錯一句的代價比生活主題高很多。
 * 所以走 `Unit[]` 手寫，和 `basics` 同一條路：離線能用、不吃 AI 額度、內容固定。
 *
 * ## 挑這四個單元的理由
 *
 * 不做「文法大全」。這裡只收**看懂一個日文句子最少需要的四件事**：
 * 句尾（です・ます）、助詞、動詞變化、形容詞。學完能拆解生活主題裡的句子就夠了，
 * 剩下的交給主題課在情境裡遇到。
 *
 * 每課都刻意不帶文法術語當標題（不寫「五段動詞的ます形」），
 * 因為會被術語擋住的人正是這一階要救的人。
 */

const desu: Lesson = {
  id: 'gram-desu', title: '「〜です」和「〜は」', subtitle: '日文句子的骨架：誰、是什麼', kind: 'vocab', minutes: 5,
  steps: [
    { type: 'learn', ja: '私は学生です。', reading: 'わたしはがくせいです。', zh: '我是學生。',
      note: '日文的基本句型是「A は B です」＝ A 是 B。動詞放在最後，這一點和中文相反。' },
    { type: 'learn', ja: 'これは本です。', reading: 'これはほんです。', zh: '這是書。',
      note: '「は」當助詞時唸「わ」不唸「は」。這是初學最常見的誤讀。' },
    { type: 'learn', ja: '私は学生じゃないです。', reading: 'わたしはがくせいじゃないです。', zh: '我不是學生。',
      note: '否定把「です」換成「じゃないです」。更正式的場合說「ではありません」。' },
    { type: 'learn', ja: '学生でした。', reading: 'がくせいでした。', zh: '（以前）是學生。',
      note: '過去式把「です」變成「でした」。日文的時態是靠句尾變，不是加「了」。' },
    { type: 'learn', ja: 'あなたは学生ですか。', reading: 'あなたはがくせいですか。', zh: '你是學生嗎？',
      note: '句尾加「か」就是疑問句，語序完全不用動。日文書面常不加問號。' },
    { type: 'choice', label: '文法', line: '私は台湾人＿＿。', lineZh: '我是台灣人。',
      question: '空格要填什麼？',
      options: [
        { text: 'です', sub: '是' },
        { text: 'でした', sub: '（以前）是', hint: '這是過去式，但句子講的是現在。' },
        { text: 'じゃないです', sub: '不是', hint: '這會變成「我不是台灣人」。' },
      ],
      answer: 0, explain: '現在、肯定的「A 是 B」就用「です」。' },
    { type: 'choice', label: '唸法', line: '私は日本人です。', lineZh: '我是日本人。',
      speak: '私は日本人です。', question: '句子裡的「は」要怎麼唸？',
      options: [
        { text: 'わ', sub: 'wa' },
        { text: 'は', sub: 'ha', hint: '「は」當助詞時要唸成「わ」，這是固定的例外。' },
      ],
      answer: 0, explain: '當助詞的「は」唸「わ」。寫的時候還是寫「は」。' },
    { type: 'choice', label: '情境', line: '有人問你「学生ですか」，但你已經在工作了。',
      question: '要怎麼回答？',
      options: [
        { text: 'はい、学生です。', sub: '是，我是學生', hint: '這是肯定，但你不是學生。' },
        { text: 'いいえ、学生じゃないです。', sub: '不，我不是學生' },
        { text: 'いいえ、学生でした。', sub: '不，我以前是學生', hint: '文法沒錯，但沒有回答「現在是不是」。' },
      ],
      answer: 1, explain: '否定用「じゃないです」。想補充的話可以再說「会社員です」。' },
  ],
};

const particles: Lesson = {
  id: 'gram-particles', title: '助詞：を・に・で・へ', subtitle: '一個字決定誰對誰做了什麼', kind: 'vocab', minutes: 5,
  steps: [
    { type: 'learn', ja: 'ご飯を食べます。', reading: 'ごはんをたべます。', zh: '吃飯。',
      note: '「を」標記動作的對象（吃「什麼」）。它只有當助詞這一個用途，唸「お」。' },
    { type: 'learn', ja: '七時に起きます。', reading: 'しちじにおきます。', zh: '七點起床。',
      note: '「に」用在**時間點**和**到達點**。「学校に行きます」＝去學校。' },
    { type: 'learn', ja: '家で食べます。', reading: 'いえでたべます。', zh: '在家裡吃。',
      note: '「で」是動作發生的**場所**。和「に」最容易混：「に」是到哪裡，「で」是在哪裡做事。' },
    { type: 'learn', ja: '友達と行きます。', reading: 'ともだちといきます。', zh: '和朋友一起去。',
      note: '「と」＝和、跟。列舉東西時也用它：「パンと牛乳」。' },
    { type: 'learn', ja: 'バスで行きます。', reading: 'バスでいきます。', zh: '搭公車去。',
      note: '「で」還有一個用法是**手段**：交通工具、用什麼工具、用什麼語言。' },
    { type: 'choice', label: '文法', line: '図書館＿＿勉強します。', lineZh: '在圖書館唸書。',
      question: '空格要填什麼？',
      options: [
        { text: 'で', sub: '在（做事的場所）' },
        { text: 'に', sub: '到（到達點）', hint: '「図書館に行きます」才對。這句是在圖書館做事。' },
        { text: 'を', sub: '（動作的對象）', hint: '「を」後面接的是被做的東西，不是地點。' },
      ],
      answer: 0, explain: '在某處做某事用「で」，移動到某處用「に」。' },
    { type: 'choice', label: '文法', line: '八時＿＿会社＿＿行きます。', lineZh: '八點去公司。',
      question: '兩個空格依序是？',
      options: [
        { text: 'に / に', sub: '時間點 / 到達點' },
        { text: 'で / に', sub: '場所 / 到達點', hint: '時間點要用「に」。' },
        { text: 'に / で', sub: '時間點 / 場所', hint: '「行きます」是移動，到達點要用「に」。' },
      ],
      answer: 0, explain: '「に」同時管時間點和到達點，所以這句兩個都是「に」。' },
    { type: 'choice', label: '情境', line: '你想說「和朋友在咖啡廳喝咖啡」。',
      question: '哪一句對？',
      options: [
        { text: '友達とカフェでコーヒーを飲みます。', sub: '和朋友・在咖啡廳・喝咖啡' },
        { text: '友達にカフェとコーヒーを飲みます。', sub: '', hint: '「と」是和誰，「で」是在哪裡，這句兩個都錯位了。' },
        { text: '友達とカフェにコーヒーで飲みます。', sub: '', hint: '在咖啡廳「做事」要用「で」。' },
      ],
      answer: 0, explain: '一句話裡常常好幾個助詞各司其職：と（和誰）・で（在哪）・を（喝什麼）。' },
  ],
};

const verbs: Lesson = {
  id: 'gram-verbs', title: '動詞怎麼變', subtitle: 'ます・ません・ました・ませんでした', kind: 'vocab', minutes: 5,
  steps: [
    { type: 'learn', ja: '食べます', reading: 'たべます', zh: '吃（現在・肯定）',
      note: '「〜ます」是禮貌體。對不熟的人、店員、同事一律用這個形，不會失禮。' },
    { type: 'learn', ja: '食べません', reading: 'たべません', zh: '不吃（現在・否定）',
      note: '否定把「ます」換成「ません」。' },
    { type: 'learn', ja: '食べました', reading: 'たべました', zh: '吃了（過去・肯定）',
      note: '過去把「ます」換成「ました」。' },
    { type: 'learn', ja: '食べませんでした', reading: 'たべませんでした', zh: '沒有吃（過去・否定）',
      note: '過去否定是「ません」＋「でした」。四個格子湊齊就是日文動詞的基本盤。' },
    { type: 'learn', ja: '明日行きます。', reading: 'あしたいきます。', zh: '明天要去。',
      note: '日文**沒有未來式**：「ます」同時表示現在習慣和未來。時間點靠「明日」這種詞講清楚。' },
    { type: 'choice', label: '文法', line: '昨日は何も＿＿。', lineZh: '昨天什麼都沒吃。',
      question: '空格要填什麼？',
      options: [
        { text: '食べませんでした', sub: '沒有吃（過去否定）' },
        { text: '食べません', sub: '不吃（現在否定）', hint: '句子說的是昨天，要用過去。' },
        { text: '食べました', sub: '吃了', hint: '「何も」後面要接否定。' },
      ],
      answer: 0, explain: '「何も」（什麼都…）一定搭配否定形，加上昨天＝過去否定。' },
    { type: 'choice', label: '文法', line: '来週、東京へ＿＿。', lineZh: '下週要去東京。',
      question: '空格要填什麼？',
      options: [
        { text: '行きます', sub: '去' },
        { text: '行きました', sub: '去了', hint: '「来週」是下週，不能用過去。' },
        { text: '行きませんでした', sub: '沒有去', hint: '這是過去否定。' },
      ],
      answer: 0, explain: '日文沒有未來式，未來的事也用「ます」。' },
    { type: 'choice', label: '情境', line: '同事問你「昼ご飯、食べましたか」。你還沒吃。',
      question: '怎麼回最自然？',
      options: [
        { text: 'いいえ、まだです。', sub: '還沒' },
        { text: 'いいえ、食べません。', sub: '我不吃', hint: '這聽起來像「我不打算吃」，不是「還沒吃」。' },
        { text: 'はい、食べませんでした。', sub: '', hint: '「はい」和否定湊在一起會讓人聽不懂。' },
      ],
      answer: 0, explain: '「まだです」＝還沒，是日常最常用的回答。完整說是「まだ食べていません」。' },
  ],
};

const adjectives: Lesson = {
  id: 'gram-adj', title: '形容詞有兩種', subtitle: 'い形容詞和な形容詞的差別', kind: 'vocab', minutes: 5,
  steps: [
    { type: 'learn', ja: '高いです。', reading: 'たかいです。', zh: '很貴。',
      note: '結尾是「い」的叫**い形容詞**：高い、安い、おいしい、楽しい。' },
    { type: 'learn', ja: '静かです。', reading: 'しずかです。', zh: '很安靜。',
      note: '結尾不是「い」的叫**な形容詞**：静か、便利、好き、元気。' },
    { type: 'learn', ja: '高い店／静かな店', reading: 'たかいみせ／しずかなみせ', zh: '貴的店／安靜的店',
      note: '**差別就在修飾名詞的時候**：い形容詞直接接，な形容詞要加「な」——名字就是這樣來的。' },
    { type: 'learn', ja: '高くないです。', reading: 'たかくないです。', zh: '不貴。',
      note: 'い形容詞的否定是把「い」換成「くない」。注意不是「高いじゃない」。' },
    { type: 'learn', ja: '静かじゃないです。', reading: 'しずかじゃないです。', zh: '不安靜。',
      note: 'な形容詞的否定和名詞一樣用「じゃないです」。' },
    { type: 'learn', ja: 'いい → よくないです', reading: 'いい → よくないです', zh: '好 → 不好',
      note: '「いい」是唯一的例外，變化時要先變回「よい」：よくない、よかった。' },
    { type: 'choice', label: '文法', line: '便利＿＿場所です。', lineZh: '是方便的地方。',
      question: '空格要填什麼？',
      options: [
        { text: 'な', sub: '（な形容詞修飾名詞）' },
        { text: 'い', sub: '', hint: '「便利」不是い結尾，它是な形容詞。' },
        { text: '（不用填）', sub: '', hint: 'な形容詞接名詞一定要「な」。' },
      ],
      answer: 0, explain: '「便利」是な形容詞，修飾名詞時要「便利な場所」。' },
    { type: 'choice', label: '文法', line: 'この店は高＿＿です。', lineZh: '這家店不貴。',
      question: '空格要填什麼？',
      options: [
        { text: 'くない', sub: '不…（い形容詞的否定）' },
        { text: 'いじゃない', sub: '', hint: 'い形容詞不能用「じゃない」，那是な形容詞和名詞的用法。' },
        { text: 'くありません', sub: '不…（更正式）', hint: '這個形也對，但這裡要填的是最常用的日常說法。' },
      ],
      answer: 0, explain: 'い形容詞去掉「い」加「くない」。「高くないです」＝不貴。' },
    { type: 'choice', label: '情境', line: '朋友問你昨天的拉麵好不好吃，你覺得很好吃。',
      question: '哪一句對？',
      options: [
        { text: 'おいしかったです。', sub: '很好吃（過去）' },
        { text: 'おいしいでした。', sub: '', hint: 'い形容詞的過去不是加「でした」，是把「い」變成「かった」。' },
        { text: 'おいしくなかったです。', sub: '不好吃', hint: '這是否定。' },
      ],
      answer: 0, explain: 'い形容詞的過去式是「〜かった」：おいしい → おいしかった。' },
  ],
};

export const GRAMMAR_ID = 'grammar';

export const grammarUnits: Unit[] = [
  { id: 'u-gram-sentence', title: '句子的骨架', description: '誰、是什麼、是不是、以前是不是', lessons: [desu] },
  { id: 'u-gram-particles', title: '助詞', description: '一個假名決定誰對誰做了什麼', lessons: [particles] },
  { id: 'u-gram-verbs', title: '動詞', description: '肯定、否定、過去，四個格子就夠用', lessons: [verbs] },
  { id: 'u-gram-adj', title: '形容詞', description: 'い形容詞和な形容詞，差別在修飾名詞的時候', lessons: [adjectives] },
];
