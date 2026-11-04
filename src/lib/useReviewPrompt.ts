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
 */
export function useReviewPrompt(active: boolean) {
  const d = useData();
  // 同一個畫面只問一次。使用者在完成頁來回切換時不該被問第二次
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    const r = d.progress.review;
    if (!shouldAskReview(r, d.progress.completed.length)) return;

    fired.current = true;
    const timer = setTimeout(async () => {
      const res = await askForReview();
      d.setReview({ ...res, asked: r.asked + 1 });
    }, 1200);
    return () => clearTimeout(timer);
  }, [active]);
}
