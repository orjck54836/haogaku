import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { markAsked, shouldAskReview, submitFeedback, hasFeedbackChannel } from '../lib/review';
import { track } from '../lib/analytics';

/**
 * 問「喜歡皓學日語嗎」的卡片，喜歡才叫原生評分視窗。
 *
 * ## 為什麼是卡片不是彈窗
 *
 * 原本是 `Alert`：時機抓得再準，它都蓋在畫面正中央、擋住剛完成的慶祝。
 * 卡片放在版面裡，看到的人自己決定要不要點，不想理它就往下滑——
 * 代價是觸及率低一點，但一輩子只問 3 次的額度不會被「隨手關掉」燒掉。
 *
 * 分流邏輯在 `lib/review.ts`：喜歡才叫原生評分視窗，有意見導去 LINE。
 * 這裡不畫星星，理由見 `submitFeedback()`。**不要用 AI 次數之類的好處換評價**，
 * 那是 App Store 1.1.6／5.6.1 明文禁止的事（理由寫在 review.ts 檔頭）。
 *
 * ## 為什麼「顯示出來」就記一次
 *
 * `list` 是常駐版位，不記的話每次進首頁都會再長出來。所以照 `FollowInvite`
 * 的做法：真的 render 出來才 `markAsked()`，判斷和記錄分開，
 * 重新 render 不會重複燒額度（`counted` 擋住）。
 * 30 天之後才會再出現一次，三次用完就永遠不再出現。
 */

type Props = {
  /**
   * `done`：課程／讀物完成頁，心情最好的時刻，文案講「有幫到你嗎」。
   * `list`：首頁和讀物列表的內容流中間，文案中性一點。
   */
  placement: 'done' | 'list';
  style?: object;
};

export default function ReviewCard({ placement, style }: Props) {
  const t = useTheme();
  const d = useData();
  const r = d.progress.review;
  // 第一次判斷就鎖住：點完星星 state 會變，不鎖的話卡片會在動畫中途整塊消失
  const eligible = useRef<boolean | null>(null);
  if (eligible.current === null) {
    eligible.current = shouldAskReview(r, d.progress.completed.length);
  }
  const counted = useRef(false);
  const [answer, setAnswer] = useState<'like' | 'meh' | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!eligible.current || counted.current) return;
    counted.current = true;
    d.setReview({ ...markAsked(), asked: r.asked + 1 });
    // 三段漏斗：看到 → 回答（喜歡／有意見／以後再說）。只記回答的話算不出觸及率
    track('review_prompt_shown', { placement, n: r.asked + 1 });
  }, []);

  if (!eligible.current || hidden) return null;

  function pick(liked: boolean) {
    setAnswer(liked ? 'like' : 'meh');
    track('review_answer', { placement, answer: liked ? 'like' : 'meh' });
    // 不再累加 asked：掛載時已經記過這一次了，這裡只補上 done
    d.setReview(submitFeedback(liked));
    // 留 1.2 秒讓他看到謝謝，直接消失會像點壞了
    setTimeout(() => setHidden(true), 1200);
  }

  /**
   * 「喜歡」的文案**不要承諾會跳出什麼**。
   *
   * `requestReview()` 只是「請求」，系統有權不顯示（一年三次的上限、剛顯示過），
   * 叫不出來時才退回 App Store 頁（`appStoreUrl`，見 app.config.ts）。
   * 兩條路哪一條會發生、甚至會不會發生，畫面這邊都不知道——
   * 文案寫死「正在開啟 App Store」，碰上系統安靜吞掉請求的那次就是說謊。
   */
  const thanks = answer === 'like' ? '謝謝你的支持！'
    : answer === 'meh' ? (hasFeedbackChannel() ? '謝謝，想聽聽你覺得可以更好的地方' : '謝謝你的回饋')
    : null;

  /**
   * 列表版不鋪酒紅：首頁和讀物列表已經有一塊飽和色（設計原則 4，見 theme.ts 檔頭），
   * 再鋪一塊就會變成兩塊搶注意力。改用米白底＋金色星星，份量剛好夠被看到。
   * 完成頁沒有別的色塊（升段卡出現時這張根本不顯示），可以鋪滿。
   */
  const solid = placement === 'done';
  const bg = solid ? t.primary : t.surface;
  const fg = solid ? t.onPrimary : t.heading;
  const dim = solid ? 'rgba(255,255,255,0.72)' : t.sub;

  return (
    <View style={{
      backgroundColor: bg, borderRadius: radius.lg,
      paddingVertical: space.xl, paddingHorizontal: space.lg,
      alignItems: 'center', gap: space.md, ...style,
    }}>
      <T variant="heading" color={fg} style={{ textAlign: 'center' }}>
        {placement === 'done' ? '皓學日語有幫到你嗎？' : '喜歡皓學日語嗎？'}
      </T>
      {answer ? null : (
        <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
          {/* 兩顆一樣大：把「有意見」縮成一行小字等於在誘導，負評的人會改去商店寫 */}
          <Choice label="喜歡" icon="heart" strong solid={solid} onPress={() => pick(true)} />
          <Choice label="有意見" icon="chatbubble-ellipses-outline" solid={solid} onPress={() => pick(false)} />
        </View>
      )}
      {thanks
        ? <T variant="caption" color={dim} style={{ textAlign: 'center' }}>{thanks}</T>
        : (
          <Pressable onPress={() => { track('review_answer', { placement, answer: 'later' }); setHidden(true); }} hitSlop={8} accessibilityRole="button">
            <T variant="caption" color={dim}>以後再說</T>
          </Pressable>
        )}
    </View>
  );
}

/** 卡片裡的兩顆選擇。共用的 Button 沒有「疊在酒紅底上」的配色，outline 的字是黑的 */
function Choice({ label, icon, strong, solid, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; strong?: boolean; solid: boolean; onPress: () => void;
}) {
  const t = useTheme();
  const bg = strong ? (solid ? '#FFFFFF' : t.primary) : 'transparent';
  const fg = strong ? (solid ? t.primary : t.onPrimary) : (solid ? '#FFFFFF' : t.ink);
  const border = strong ? 'transparent' : (solid ? 'rgba(255,255,255,0.6)' : t.lineStrong);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: radius.pill, backgroundColor: bg,
        borderWidth: strong ? 0 : 1.5, borderColor: border, opacity: pressed ? 0.85 : 1,
      })}>
      <Ionicons name={icon} size={16} color={fg} />
      <T style={{ fontSize: 14, fontWeight: '700' }} color={fg}>{label}</T>
    </Pressable>
  );
}
