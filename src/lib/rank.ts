import { Lesson, LevelId } from '../content/types';
import type { Topic } from '../content/topics';

/**
 * 等級制度。
 *
 * 「等級」是 XP 換來的**成就**，和「日語程度」（LevelId，初級／進階）是兩件不同的事——
 * 程度是使用者自己選的難度，等級是練出來的。兩個都叫 level 會看不懂，
 * 所以這裡一律叫「段位」（rank），畫面上寫「Lv.3 辛」。
 *
 * 刻意不從 curriculum.ts import：curriculum 會 import state/data 的 Goal，
 * data 之後若要顯示段位就得 import 回來，變成循環。這裡自己留一份 levelOrder。
 */

const levelOrder: LevelId[] = ['L2', 'L3'];
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
  /**
   * 「在日本的你」：這一段大概能自己搞定什麼場面。
   *
   * desc 是氣氛，這個是**量尺**——使用者問的是「Lv.3 到底算什麼程度」，
   * 回答要是一個他想像得到的場景，而且一段比一段難、不會互相重疊。
   * 刻意不寫 JLPT：段位看的是練習量，只刷初級也能一路升到 Lv.10，
   * 寫「約 N2」會變成在替考試掛保證。
   */
  scene: string;
};

/**
 * 十段用十天干命名，**從癸往甲爬**：甲是最高段。
 * 台灣人對「甲等、甲上」的直覺就是甲最好，照天干原本的順序把甲放在 Lv.1 會讀反。
 * 名字只是一個字，說不出程度，所以「這一段搞得定什麼」交給 `scene`。
 *
 * 走的路還是「旅人 → 在地生活 → 職場 → 語感」，寫在 desc／scene 裡。
 *
 * 門檻的間距刻意前密後疏：一堂課大約 60〜130 XP，
 * 所以 Lv.2 第一天就會到（要有立刻升一級的手感），
 * Lv.10 則要三百堂課上下——那是給真的學完的人留的位子。
 */
export const ranks: Rank[] = [
  { n: 1, name: '癸', kanji: '癸', at: 0, desc: '剛落地，什麼都新鮮', scene: '靠比手畫腳撐過第一天' },
  { n: 2, name: '壬', kanji: '壬', at: 150, desc: '有一家店的店員認得你了', scene: '便利商店、點餐自己來' },
  { n: 3, name: '辛', kanji: '辛', at: 500, desc: '別人問路，你答得出來', scene: '一個人自由行一週' },
  { n: 4, name: '庚', kanji: '庚', at: 1200, desc: '能把一件事從頭講完', scene: '和民宿老闆聊上十分鐘' },
  { n: 5, name: '己', kanji: '己', at: 2400, desc: '聊天不用再想句型', scene: '打工度假，日常不卡關' },
  { n: 6, name: '戊', kanji: '戊', at: 4200, desc: '職場的場面話接得住', scene: '在日商開會聽懂八成' },
  { n: 7, name: '丁', kanji: '丁', at: 6800, desc: '尊敬語和謙讓語不會再搞混', scene: '接待日本客戶不失禮' },
  { n: 8, name: '丙', kanji: '丙', at: 10500, desc: '聽得懂話裡沒說出來的那半句', scene: '日劇關掉字幕也跟得上' },
  { n: 9, name: '乙', kanji: '乙', at: 15500, desc: '換一個詞，語氣就跟著變', scene: '吵架吵得贏日本人' },
  { n: 10, name: '甲', kanji: '甲', at: 22000, desc: '日文已經是你自己的語言', scene: '被問「你是哪個縣的人？」' },
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
    : 1;   // 五十音、看懂招牌
  // 標為進階的主題比較難，但不該難到兩倍——加 15%
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
  return [30, 45][levelIndex(level)];
}

/** AI 會話一場。要自己生句子，所以比任何一堂課都高 */
export const CHAT_XP = 40;

/** 單字複習一張卡。量大所以單張要小，不然複習會變成刷分捷徑 */
export const REVIEW_XP = { known: 3, forgot: 1 } as const;

/**
 * 日檢測驗一題。**只有第一次答對給**：題庫一級只有幾題、每天才加一點，
 * 重做同一份能一直拿的話，日檢會變成整個 App 最快的刷分處。
 * 比複習單字（3）高一點，因為四選一要先看懂整句。
 */
export const JLPT_XP = 4;

/** 難度係數給畫面用的標籤：1.6 → 「XP ×1.6」。係數 1 的不顯示，免得每張卡都掛一個 */
export function weightLabel(w: number): string | null {
  return w > 1 ? `XP ×${w}` : null;
}

/**
 * 每日簽到。
 *
 * 簽到看的是**累計**天數，不是連續：漏一天不歸零，第 7、14、21…次簽到給大的那份。
 * 連續的壓力已經由「連續學習」那條在擔（還有保護卡可以救），
 * 簽到再做一條會斷的，等於一天斷兩次——第二條斷掉的人最容易就此不回來。
 *
 * 數字刻意小：一堂課 60〜130 XP，簽到 5 分只是「打開就有」的手感，
 * 大到能拿來刷排行榜就變成在獎勵只打開不學。
 */
export const CHECKIN_XP = { daily: 5, seventh: 25 } as const;
export const checkinXp = (nth: number) => (nth > 0 && nth % 7 === 0 ? CHECKIN_XP.seventh : CHECKIN_XP.daily);
