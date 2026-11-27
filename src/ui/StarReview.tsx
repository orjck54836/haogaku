import { useEffect, useRef, useState } from 'react';
import { View, Animated, Platform } from 'react-native';
import { Pressable } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius, shadows } from '../theme';
import { useData } from '../state/data';
import { openWriteReview } from '../lib/review';
import { track } from '../lib/analytics';

/**
 * 課程完成頁的五顆星，還沒點過的人每一堂都看得到。
 *
 * ## 為什麼每堂都出現
 *
 * `ReviewCard` 一輩子只問 3 次、隔 30 天，結果商店上幾乎沒有評論——
 * 願意評的人碰不到入口。星星改成常駐，點過一次（`review.rated`）才收起來。
 *
 * ## 不能做的兩件事（商店會處分，不是退件而已）
 *
 * 1. **不分流**：1 星和 5 星都去同一個撰寫評論頁。低星導去 LINE、高星才送商店，
 *    就是 Apple 5.6.1／Google Play 的 review gating，以前做過又拆掉（見 review.ts）。
 * 2. **不拿好處換**：文案不能出現 XP、次數、解鎖。
 *
 * 點的那顆星我們不存、也不傳到商店（商店頁沒有預選星數的參數）；
 * 它只是讓「去評分」這個動作有個順手的起點。只記到 analytics 看分布。
 */
export default function StarReview({ style }: { style?: object }) {
  const t = useTheme();
  const d = useData();
  // 第一次 render 就鎖住：點完 rated 變 true，不鎖的話卡片會在謝謝出現前整塊消失
  const show = useRef(!d.progress.review.rated);
  const [picked, setPicked] = useState(0);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (show.current) track('review_prompt_shown', { placement: 'stars' });
  }, []);

  if (!show.current) return null;

  function pick(n: number) {
    if (picked) return;
    setPicked(n);
    track('review_answer', { placement: 'stars', answer: 'stars', stars: n });
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.18, duration: 120, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    d.setReview({ rated: true });
    // 先讓他看到星星亮起來再跳走，馬上切出 App 會像誤觸
    setTimeout(openWriteReview, 450);
  }

  return (
    <View style={{
      backgroundColor: t.surface, borderRadius: radius.lg, ...shadows.md,
      paddingVertical: space.lg, paddingHorizontal: space.lg,
      alignItems: 'center', gap: space.sm, ...style,
    }}>
      <T variant="heading" style={{ fontSize: 16, textAlign: 'center' }}>
        {picked ? '謝謝！到商店寫一句會幫我們很多' : '幫皓學日語評個分'}
      </T>
      <Animated.View style={{ flexDirection: 'row', gap: space.sm, transform: [{ scale: pop }] }}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable key={n} tapId={`${n} 顆星`} onPress={() => pick(n)} hitSlop={4}
            accessibilityRole="button" accessibilityLabel={`${n} 顆星，前往商店評分`}>
            <Ionicons name={n <= picked ? 'star' : 'star-outline'} size={32} color={t.gold} />
          </Pressable>
        ))}
      </Animated.View>
      {picked ? null : <T variant="caption" color={t.sub}>{'點星星前往 ' + (Platform.OS === 'ios' ? 'App Store' : 'Google Play')}</T>}
    </View>
  );
}
