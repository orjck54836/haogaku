import { Lesson, LevelId } from '../content/types';
import type { Topic } from '../content/topics';

/**
 * 等級制度。
 *
 * 「等級」是 XP 換來的**成就**，和「日語程度」（LevelId，L1〜L4）是兩件不同的事——
 * 程度是使用者自己選的難度，等級是練出來的。兩個都叫 level 會看不懂，
 * 所以這裡一律叫「段位」（rank），畫面上寫「Lv.3 道案内」。
 *
 * 刻意不從 curriculum.ts import：curriculum 會 import state/data 的 Goal，
 * data 之後若要顯示段位就得 import 回來，變成循環。這裡自己留一份 levelOrder。
 */

const levelOrder: LevelId[] = ['L1', 'L2', 'L3', 'L4'];
const levelIndex = (id: LevelId) => Math.max(0, levelOrder.indexOf(id));

export type Rank = {
  /** 1 起算，畫面上的 Lv. 數字 */
  n: number;
  /** 段位名（日文），印在 Lv. 後面 */
  name: string;
  /** 一個漢字，拿去蓋印章 */
  kanji: string;
  /** 達到這個段位需要的累積 XP */
  at: number;
  /** 中文一句話，說明這一段代表什麼 */
  desc: string;
};

/**
 * 十段，走的是「旅人 → 在地生活 → 職場 → 語感」這條路。
 *
 * 門檻的間距刻意前密後疏：一堂課大約 60〜130 XP，
 * 所以 Lv.2 第一天就會到（要有立刻升一級的手感），
 * Lv.10 則要三百堂課上下——那是給真的學完的人留的位子。
 */
export const ranks: Rank[] = [
  { n: 1, name: '旅人', kanji: '旅', at: 0, desc: '剛落地，什麼都新鮮' },
  { n: 2, name: '常連客', kanji: '客', at: 150, desc: '有一家店的店員認得你了' },
  { n: 3, name: '道案内', kanji: '道', at: 500, desc: '別人問路，你答得出來' },
  { n: 4, name: '語り手', kanji: '語', at: 1200, desc: '能把一件事從頭講完' },
  { n: 5, name: '日本の友', kanji: '友', at: 2400, desc: '聊天不用再想句型' },
  { n: 6, name: '社会人', kanji: '職', at: 4200, desc: '職場的場面話接得住' },
  { n: 7, name: '敬語達人', kanji: '敬', at: 6800, desc: '尊敬語和謙讓語不會再搞混' },
  { n: 8, name: '粋', kanji: '粋', at: 10500, desc: '聽得懂話裡沒說出來的那半句' },
  { n: 9, name: '言葉の匠', kanji: '匠', at: 15500, desc: '換一個詞，語氣就跟著變' },
  { n: 10, name: '皓學', kanji: '皓', at: 22000, desc: '日文已經是你自己的語言' },
];

export type RankState = {
  rank: Rank;
  /** 下一段。已經滿級就是 null */
  next: Rank | null;
  /** 這一段裡已累積的 XP */
  into: number;
  /** 這一段需要的 XP 總量。滿級時等於 into */
  span: number;
  /** 0〜1，進度環用 */
  pct: number;
  /** 還差多少 XP 升級。滿級是 0 */
  toNext: number;
};

export function rankOf(xp: number): Rank {
  let r = ranks[0];
  for (const x of ranks) if (xp >= x.at) r = x;
  return r;
}

export function rankState(xp: number): RankState {
  const rank = rankOf(xp);
  const next = ranks[rank.n] ?? null;   // ranks 是 0-indexed，rank.n 剛好是下一個的 index
  if (!next) {
    const into = xp - rank.at;
    return { rank, next: null, into, span: into, pct: 1, toNext: 0 };
  }
  const span = next.at - rank.at;
  const into = xp - rank.at;
  return { rank, next, into, span, pct: span ? into / span : 1, toNext: next.at - xp };
}

/* ------------------------------------------------------------------ *
 * XP 權重
 * ------------------------------------------------------------------ */

/**
 * 課程類型的難度係數。
 *
 * 同一個主題的三堂課難度差很多：「基本說法」是給句型照著唸，
 * 「道地說法」要分辨語氣，「情境練習」得先聽懂對方才能選——
 * 三堂給一樣的 XP，等於在獎勵只刷基本說法。
 *
 * AI 會話是唯一要自己生出句子的，所以係數最高。
 */
const genWeight = { basic: 1, native: 1.3, practice: 1.6 } as const;

/** 一堂課的難度係數。主題本身有建議程度的（minLevel）再往上加 */
export function lessonWeight(lesson: Lesson, topic?: Topic): number {
  const base = lesson.kind === 'ai' ? 2
    : lesson.kind === 'gen' ? genWeight[lesson.genKind ?? 'basic']
    : 1;   // 五十音、看懂招牌、人工寫的基本課
  // L3 的主題比 L1 難，但不該難到兩倍——每升一階加 15%
  const byLevel = topic?.minLevel ? 1 + 0.15 * levelIndex(topic.minLevel) : 1;
  return Math.round(base * byLevel * 10) / 10;
}

/** 基礎分：答對、答錯後再對、整課完成 */
const BASE = { first: 10, retry: 5, finish: 20 } as const;

export type LessonXp = { first: number; retry: number; finish: number; weight: number };

export function lessonXp(lesson: Lesson, topic?: Topic): LessonXp {
  const w = lessonWeight(lesson, topic);
  const r = (n: number) => Math.max(1, Math.round(n * w));
  return { first: r(BASE.first), retry: r(BASE.retry), finish: r(BASE.finish), weight: w };
}

/**
 * 讀物的 XP。
 * 沒有題目可以答，所以一次給完，額度大約等於一堂中等難度的課
 * （讀一篇 L2 的文章，付出的心力和上一堂「道地說法」差不多）。
 */
export function readingXp(level: LevelId): number {
  return [25, 35, 45, 55][levelIndex(level)];
}

/** AI 會話一場。要自己生句子，所以比任何一堂課都高 */
export const CHAT_XP = 40;

/** 單字複習一張卡。量大所以單張要小，不然複習會變成刷分捷徑 */
export const REVIEW_XP = { known: 3, forgot: 1 } as const;

/** 難度係數給畫面用的標籤：1.6 → 「XP ×1.6」。係數 1 的不顯示，免得每張卡都掛一個 */
export function weightLabel(w: number): string | null {
  return w > 1 ? `XP ×${w}` : null;
}
