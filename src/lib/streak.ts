import { dayString } from './date';

/**
 * 連續學習、保護卡、每日簽到的純函式。不碰 state，data.tsx 呼叫它們再 commit。
 *
 * 兩條線要分清楚：
 * - **連續學習**（`streak`）：有賺到 XP 的日子才算（上課、讀物、複習單字），會斷。
 * - **簽到**（`checkins`）：打開 App 按一下，累計、不會斷。
 * 只做簽到的話，「打開就走」也能維持紀錄，那條紀錄就不代表任何學習；
 * 只做連續學習的話，忙到沒空上課的那天沒有任何理由打開 App。兩條各管一件事。
 */

/** 保護卡最多存幾張。存太多等於連續可以一週不練也不斷，那條紀錄就沒有意義了 */
export const MAX_FREEZES = 2;
/** 每連續幾天送一張 */
export const FREEZE_EVERY = 7;
/** 首頁要特別慶祝的天數 */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
/** 歷史只留這麼多天：首頁只畫本週，多留一週給跨週的那天用 */
const KEEP_DAYS = 14;

/** YYYY-MM-DD → 本地午夜。不用 new Date('YYYY-MM-DD')：那會被當成 UTC，台灣差 8 小時剛好跨錯一天 */
function parse(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function shift(day: string, n: number): string {
  const d = parse(day); d.setDate(d.getDate() + n); return dayString(d);
}
/** b 比 a 晚幾天。用 round 吸掉夏令時間那一小時（台灣沒有，但出國的人有） */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export type StreakState = {
  streak: number;
  lastDay: string | null;
  /** 有學習的日子（最近 KEEP_DAYS 天） */
  days: string[];
  /** 被保護卡補起來的日子。和 days 分開存，週曆才畫得出「這天是冰塊不是火」 */
  frozenDays: string[];
  freezes: number;
};

const trim = (xs: string[], t: string) => xs.filter(d => daysBetween(d, t) < KEEP_DAYS);

/**
 * 開 App（或跨日回前景）時結算一次：漏掉的天數保護卡夠補，就自動補上。
 *
 * **自動用、不問**：問了就得在他回來的第一個畫面跳一個對話框，
 * 而且答案只有一個（沒有人會選「不用，讓我斷掉」）。用掉了在首頁講一聲就好。
 * 不夠補就一張都不扣——斷了還把卡吃掉是雙重懲罰。
 */
export function settle(s: StreakState, t: string): { next: StreakState; used: number } {
  if (!s.lastDay || s.streak <= 0) return { next: s, used: 0 };
  const missed = daysBetween(s.lastDay, t) - 1;
  if (missed < 1 || missed > s.freezes) return { next: s, used: 0 };
  const filled = Array.from({ length: missed }, (_, i) => shift(s.lastDay!, i + 1));
  return {
    used: missed,
    next: {
      ...s,
      freezes: s.freezes - missed,
      // 補到昨天：今天練了就是 +1，沒練 streak() 也還認得（lastDay === 昨天）
      lastDay: shift(t, -1),
      frozenDays: trim([...s.frozenDays, ...filled], t),
    },
  };
}

/**
 * 今天賺到 XP 了。回傳 earned：這次有沒有送出一張保護卡（畫面要講）。
 * 補過的日子不算進 streak 天數——保護卡是讓紀錄不斷，不是送天數。
 */
export function recordDay(s: StreakState, t: string): { next: StreakState; earned: boolean } {
  if (s.lastDay === t) return { next: s, earned: false };
  const streak = s.lastDay === shift(t, -1) ? s.streak + 1 : 1;
  const earned = streak % FREEZE_EVERY === 0 && s.freezes < MAX_FREEZES;
  return {
    earned,
    next: {
      ...s, streak, lastDay: t,
      days: trim([...s.days.filter(d => d !== t), t], t),
      freezes: earned ? s.freezes + 1 : s.freezes,
      // 斷了重來的人，舊的冰塊留在週曆上會看起來像還連著
      frozenDays: streak === 1 ? [] : s.frozenDays,
    },
  };
}

/** 畫面上的連續天數：最後一次學習是今天或昨天才算，否則是 0（已經斷了） */
export function liveStreak(s: Pick<StreakState, 'streak' | 'lastDay'>, t: string): number {
  return s.lastDay === t || s.lastDay === shift(t, -1) ? s.streak : 0;
}

/**
 * 這次更新之前就在用的人沒有 days 歷史，週曆會整排空白——看起來像他的連續紀錄不見了。
 * 用 streak 和 lastDay 往回推出來，推得出來的就是真的。
 */
export function backfillDays(streak: number, lastDay: string | null, t: string): string[] {
  if (!lastDay || streak <= 0) return [];
  const n = Math.min(streak, KEEP_DAYS);
  return trim(Array.from({ length: n }, (_, i) => shift(lastDay, -i)), t);
}

export type WeekCell = { label: string; day: string; state: 'done' | 'frozen' | 'today' | 'missed' | 'future' };

/** 本週一到日。週一開頭：台灣的行事曆和學校課表都是這樣排 */
export function weekCells(s: Pick<StreakState, 'days' | 'frozenDays'>, t: string): WeekCell[] {
  const dow = (parse(t).getDay() + 6) % 7; // 週一 = 0
  const monday = shift(t, -dow);
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  return labels.map((label, i) => {
    const day = shift(monday, i);
    const state = s.days.includes(day) ? 'done'
      : s.frozenDays.includes(day) ? 'frozen'
      : day === t ? 'today'
      : day > t ? 'future' : 'missed';
    return { label, day, state };
  });
}

/** 下一個里程碑（給「再 N 天就到 7 天」用）。超過最後一個就沒有 */
export function nextMilestone(streak: number): number | null {
  return MILESTONES.find(m => m > streak) ?? null;
}
