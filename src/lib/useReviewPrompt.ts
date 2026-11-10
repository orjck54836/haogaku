import { useEffect, useRef } from 'react';
import { useData } from '../state/data';
import { askForReview, shouldAskReview } from './review';

/**
 * 在「剛完成一件事」的畫面上掛這個 hook，時機到了就問一次評價。
 *
 * 只在 active 轉成 true 時觸發（課上完、文章讀完的那一刻），
 * 不在 app 啟動或畫面載入時問——那時使用者還沒得到任何東西，問了只會被關掉，
 * 而且白白消耗掉「一輩子最多問三次」的額度。
 *
 * 延遲 1.2 秒是為了讓完成動畫和 LEVEL UP 先被看到。
 * 彈窗蓋在慶祝畫面上會把兩件好事都糟蹋掉。
 *
 * 回傳 `reviewing`：這一次完成有沒有被評價詢問用掉。
 * 完成頁用它決定要不要改放 IG 追蹤邀請——兩個一起出現會互相稀釋，
 * 而評價的價值更高，所以評價優先、其餘次數才讓給 IG。
 */
export function useReviewPrompt(active: boolean): { reviewing: boolean } {
  const d = useData();
  // 同一個畫面只問一次。使用者在完成頁來回切換時不該被問第二次
  const fired = useRef(false);
  /**
   * 把第一次的判斷結果鎖住。
   *
   * 不鎖的話，彈窗一關 `progress.review` 就變了（asked+1、done），
   * `shouldAskReview` 隨之翻成 false，IG 邀請會在使用者剛關掉評價彈窗的
   * 那一刻冒出來——正是我們想避免的「兩個擠在一起」。
   */
  const latched = useRef<boolean | null>(null);
  if (active && latched.current === null) {
    latched.current = shouldAskReview(d.progress.review, d.progress.completed.length);
  }

  useEffect(() => {
    if (!active || fired.current) return;
    const r = d.progress.review;
    if (!latched.current) return;

    fired.current = true;
    const timer = setTimeout(async () => {
      const res = await askForReview();
      d.setReview({ ...res, asked: r.asked + 1 });
    }, 1200);
    return () => clearTimeout(timer);
  }, [active]);

  return { reviewing: latched.current === true };
}
