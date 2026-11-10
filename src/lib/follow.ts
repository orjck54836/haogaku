import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { linkById } from '../content/links';
import { track } from './analytics';
import { today } from './date';

/**
 * IG 追蹤邀請的出現時機。
 *
 * ## 為什麼需要一組規則
 *
 * 這個邀請有兩個位置，性質不一樣，所以只有其中一個要受時機管：
 *
 * - **流行語頁**：固定擺在頁尾，一直都在。它是內容的延伸（App 裡每天一個流行語，
 *   IG 上也有每日一句），使用者是自己翻到那裡的，看不看都不打擾。這種不必管次數。
 * - **課程／讀物完成頁**：是我們主動插進去的。完成頁每天會被看好幾次，
 *   每次都掛一塊「追蹤我們」就會被當成廣告位直接忽略——忽略之後再也喚不回來，
 *   比沒放更糟。所以完成頁的那一個要照 `shouldInvite()` 擋。
 *
 * ## 為什麼存在 AsyncStorage 而不是 progress
 *
 * 跟 `reminders.ts` 同一個理由：這是「這台手機上的提示狀態」，
 * 不是學習成果，沒有跨裝置同步的價值，也不值得為它動 `progress` 的結構和遷移。
 *
 * 規則本身的理由（刻意比評價詢問寬鬆一點，因為這只是畫面上一塊，不是彈窗）：
 * 1. 至少完成 3 堂——第一次完成課程的畫面要留給成就感，不要混進導流
 * 2. 距上次出現至少 14 天
 * 3. 一輩子最多 4 次；點過就不再出現（已經追蹤的人再看到是純粹的浪費）
 */

const KEY = 'follow-invite-v1';

const MIN_COMPLETED = 3;
const MIN_DAYS_BETWEEN = 14;
const MAX_SHOWS = 4;

type FollowState = {
  /** 已經出現過幾次 */
  shown: number;
  /** 上次出現的日期 YYYY-MM-DD */
  lastShownAt: string | null;
  /** 點過了，之後都不要再出現 */
  done: boolean;
};

const empty: FollowState = { shown: 0, lastShownAt: null, done: false };

async function read(): Promise<FollowState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return empty;
    // 舊版或壞掉的值不要讓邀請整個失效，當成「還沒出現過」就好
    return { ...empty, ...(JSON.parse(raw) as Partial<FollowState>) };
  } catch {
    return empty;
  }
}

async function write(s: FollowState) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 忽略：下次再試 */ }
}

function daysSince(day: string | null): number {
  if (!day) return Infinity;
  const ms = Date.parse(`${day}T00:00:00`);
  if (Number.isNaN(ms)) return Infinity;
  return Math.floor((Date.now() - ms) / 86400000);
}

/** IG 的網址。`links.ts` 裡留空就代表還沒有 IG，邀請整個不要出現 */
export const igUrl = (): string | null => {
  const ig = linkById('ig');
  return ig?.url?.trim() ? ig.url : null;
};

/** 完成頁現在該不該出現邀請。非同步，呼叫端要在 effect 裡問、把結果存進 state */
export async function shouldInvite(completedCount: number): Promise<boolean> {
  if (!igUrl()) return false;
  if (completedCount < MIN_COMPLETED) return false;
  const s = await read();
  if (s.done || s.shown >= MAX_SHOWS) return false;
  return daysSince(s.lastShownAt) >= MIN_DAYS_BETWEEN;
}

/**
 * 記下「完成頁出現過一次」。
 *
 * 在真的渲染出來的時候才呼叫，不是在 `shouldInvite()` 裡——
 * 判斷和記錄分開，判斷式才能在別處重複呼叫而不會把額度燒掉。
 */
export async function markInvited() {
  const s = await read();
  await write({ ...s, shown: s.shown + 1, lastShownAt: today() });
  track('follow_invite_shown', { shown: s.shown + 1 });
}

/**
 * 開 IG。`where` 是哪個位置點的，用來看兩個位置的效果差多少。
 *
 * 點了就 `done`，兩個位置都算：點過的人要嘛已經追蹤、要嘛看過決定不追蹤，
 * 再問都不會改變答案。
 */
export async function openFollow(where: 'slang' | 'done') {
  const url = igUrl();
  if (!url) return;
  track('follow_tap', { where });
  const s = await read();
  await write({ ...s, done: true });
  Linking.openURL(url).catch(() => {});
}
