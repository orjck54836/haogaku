import { useRef } from 'react';
import { useData } from '../state/data';
import { shouldAskReview } from './review';

/**
 * 完成頁用：這一次完成要不要讓給評價。
 *
 * 實際的詢問由 `ReviewCard` 自己畫（它也自己記次數），這裡只回答
 * 「這次輪到評價還是 IG」——兩個一起出現會互相稀釋，而評價的價值更高
 * （影響商店排名和下載轉換），所以評價優先，其餘次數才讓給 IG。
 *
 * 判斷結果要鎖住：卡片一畫出來 `progress.review` 就變了（asked+1），
 * 不鎖的話 IG 邀請會在同一個畫面上接著冒出來，正是要避免的事。
 */
export function useReviewPrompt(active: boolean): { reviewing: boolean } {
  const d = useData();
  const latched = useRef<boolean | null>(null);
  if (active && latched.current === null) {
    latched.current = shouldAskReview(d.progress.review, d.progress.completed.length);
  }

  return { reviewing: latched.current === true };
}
