import { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { GOOD_STARS, markAsked, shouldAskReview, submitStars } from '../lib/review';

/**
 * 請使用者評分的星星卡。
 *
 * ## 為什麼是卡片不是彈窗
 *
 * 原本是 `Alert`：時機抓得再準，它都蓋在畫面正中央、擋住剛完成的慶祝。
 * 卡片放在版面裡，看到的人自己決定要不要點，不想理它就往下滑——
 * 代價是觸及率低一點，但一輩子只問 3 次的額度不會被「隨手關掉」燒掉。
 *
 * 分流邏輯沒變，仍然在 `lib/review.ts`：4 星以上才叫原生評分視窗，
 * 3 星以下導去 LINE。**不要用 AI 次數之類的好處換評價**，
 * 那是 App Store 1.1.6／5.6.1 明文禁止的事（理由寫在 review.ts 檔頭）。
 *
 * ## 為什麼「顯示出來」就記一次
 *
 * `list` 是常駐版位，不記的話每次進首頁都會再長出來。所以照 `FollowInvite`
 * 的做法：真的 render 出來才 `markAsked()`，判斷和記錄分開，
 * 重新 render 不會重複燒額度（`counted` 擋住）。
 * 60 天之後才會再出現一次，三次用完就永遠不再出現。
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
  const [picked, setPicked] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!eligible.current || counted.current) return;
    counted.current = true;
    d.setReview({ ...markAsked(), asked: r.asked + 1 });
  }, []);

  if (!eligible.current || hidden) return null;

  function tap(n: number) {
    setPicked(n);
    // 不再累加 asked：掛載時已經記過這一次了，這裡只補上 done
    d.setReview(submitStars(n));
    // 留 1.2 秒讓他看到自己點亮的星數，直接消失會像點壞了
    setTimeout(() => setHidden(true), 1200);
  }

  /**
   * 好評的文案**不要承諾會跳出什麼**。
   *
   * `requestReview()` 只是「請求」，系統有權不顯示（一年三次的上限、剛顯示過），
   * 而退回商店頁那條路現在也走不通：`appStoreUrl` 在 app.config.ts 裡是註解掉的
   * （動它會改掉 fingerprint，送審中的 build 就收不到 EAS Update，理由寫在那裡）。
   * 所以點完五顆星很可能畫面上什麼都不會發生——這時說「正在開啟 App Store」就是說謊。
   */
  const thanks = picked >= GOOD_STARS ? '謝謝你的支持！'
    : picked ? '謝謝，想聽聽你覺得可以更好的地方' : null;

  /**
   * 列表版不鋪酒紅：首頁和讀物列表已經有一塊飽和色（設計原則 4，見 theme.ts 檔頭），
   * 再鋪一塊就會變成兩塊搶注意力。改用米白底＋金色星星，份量剛好夠被看到。
   * 完成頁沒有別的色塊（升段卡出現時這張根本不顯示），可以鋪滿。
   */
  const solid = placement === 'done';
  const bg = solid ? t.primary : t.cream;
  const fg = solid ? t.onPrimary : t.heading;
  const dim = solid ? 'rgba(255,255,255,0.72)' : t.sub;
  const star = solid ? t.onPrimary : t.gold;

  return (
    <View style={{
      backgroundColor: bg, borderRadius: radius.lg,
      paddingVertical: space.xl, paddingHorizontal: space.lg,
      alignItems: 'center', gap: space.md, ...style,
    }}>
      <T variant="heading" color={fg} style={{ textAlign: 'center' }}>
        {placement === 'done' ? '皓學日語有幫到你嗎？' : '喜歡皓學日語嗎？給我們評分'}
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable key={n} disabled={picked > 0} onPress={() => tap(n)} hitSlop={6}
            accessibilityRole="button" accessibilityLabel={`給 ${n} 顆星`}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name={n <= picked ? 'star' : 'star-outline'} size={36} color={star} />
          </Pressable>
        ))}
      </View>
      {thanks
        ? <T variant="caption" color={dim} style={{ textAlign: 'center' }}>{thanks}</T>
        : (
          <Pressable onPress={() => setHidden(true)} hitSlop={8} accessibilityRole="button">
            <T variant="caption" color={dim}>以後再說</T>
          </Pressable>
        )}
    </View>
  );
}
