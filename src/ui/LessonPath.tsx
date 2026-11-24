import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { allLessons, LessonRef } from '../content/curriculum';

/**
 * 完成頁的單元進度條：這個單元有幾堂、做完幾堂、下一堂在哪。
 *
 * 目的是「再上一堂」的拉力。只有「お疲れさまでした」的話，完成是一個終點；
 * 看得到下一格在發光、離走完只差兩格，完成就變成一段路上的一步。
 * 所以剛完成的那格要**當場**變成打勾（動畫），連到下一格的線要**當場**長過去——
 * 靜態畫好的話看起來只是一張進度表，不是「我剛剛往前走了一格」。
 *
 * 沒有漸層套件（CLAUDE.md），完成格一律平光酒紅。
 */

/** 一次最多畫 5 格。平假名一個單元十幾堂，全畫的話 iPhone SE 上每格不到 20pt */
const WINDOW = 5;
const DOT = 36;

/** 「平假名：あ行、か行」→「あ行、か行」：單元名已經寫在上面，格子底下只放得下差異 */
const shortTitle = (title: string) => title.split('：').pop()!;

export default function LessonPath({ current, completed, style }: {
  current: LessonRef; completed: string[]; style?: object;
}) {
  const t = useTheme();
  const steps = allLessons.filter(r => r.group === current.group && r.topic?.id === current.topic?.id);
  const at = steps.findIndex(r => r.lesson.id === current.lesson.id);
  const isDone = (r: LessonRef) => completed.includes(r.lesson.id);
  const doneCount = steps.filter(isDone).length;
  const remaining = steps.length - doneCount;
  // 發光的那格：剛完成那堂之後第一個還沒做的。往回找沒意義——他現在要去的是下一格
  const nextAt = steps.findIndex((r, i) => i > at && !isDone(r));

  // 視窗從剛完成那格的前一格開始：看得到「剛走過的」和「接下來的」，兩邊都要有
  const start = Math.max(0, Math.min(at - 1, steps.length - WINDOW));
  const shown = steps.slice(start, start + WINDOW);

  const fill = useRef(new Animated.Value(0)).current;   // 剛完成那格打勾
  const line = useRef(new Animated.Value(0)).current;   // 連到下一格的線
  const halo = useRef(new Animated.Value(0)).current;   // 下一格的呼吸光圈
  useEffect(() => {
    Animated.sequence([
      Animated.delay(250),
      Animated.spring(fill, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
      Animated.timing(line, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(halo, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(halo, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    const id = setTimeout(() => loop.start(), 900);
    return () => { clearTimeout(id); loop.stop(); };
  }, []);

  if (steps.length < 2 || at < 0) return null;

  const headline = remaining === 0 ? `「${current.group}」全部完成！`
    : remaining === 1 ? '再一堂就完成這個單元'
    : `再 ${remaining} 堂完成這個單元`;

  return (
    <View style={{ backgroundColor: t.cream, borderRadius: radius.xl, paddingTop: space.lg, paddingBottom: space.xl, paddingHorizontal: space.xl, ...style }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T variant="eyebrow" color={t.primary} style={{ letterSpacing: 1 }}>{current.group}</T>
        <T variant="caption" color={t.sub} style={{ fontWeight: '700' }}>{doneCount} / {steps.length}</T>
      </View>
      <T variant="heading" style={{ marginTop: 2 }}>{headline}</T>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg, marginBottom: 26 }}>
        {shown.map((r, k) => {
          const i = start + k;
          const done = isDone(r);
          const justNow = i === at;
          const isNext = i === nextAt;
          const nextNode = shown[k + 1];
          // 線：兩端都完成就是實的；接到剛完成那格的兩段用動畫，才看得出「剛剛走了這一步」
          const growIn = !!nextNode && i + 1 === at && done;   // 走進來那段，跟打勾一起補滿
          const growing = !!nextNode && justNow;               // 走出去那段，晚一拍長出來
          const solid = !!nextNode && done && isDone(nextNode) && !growIn && !growing;
          return (
            <View key={r.lesson.id} style={{ flexDirection: 'row', alignItems: 'center', flex: nextNode ? 1 : 0 }}>
              <View style={{ width: DOT, alignItems: 'center' }}>
                {isNext ? (
                  <Animated.View pointerEvents="none" style={{
                    position: 'absolute', width: DOT + 16, height: DOT + 16, borderRadius: (DOT + 16) / 2,
                    top: -8, backgroundColor: t.primarySoft,
                    opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                    transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }],
                  }} />
                ) : null}
                <Node done={done} justNow={justNow} isNext={isNext} n={i + 1} fill={fill} />
                <T numberOfLines={1} style={{
                  position: 'absolute', top: DOT + 6, width: 76, textAlign: 'center',
                  fontSize: 11, lineHeight: 14, fontWeight: isNext || justNow ? '800' : '600',
                }} color={isNext ? t.ink : done ? t.primary : t.faint}>
                  {shortTitle(r.lesson.title)}
                </T>
              </View>
              {nextNode ? (
                <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.lineStrong, marginHorizontal: 4, overflow: 'hidden' }}>
                  {solid ? <View style={{ flex: 1, backgroundColor: t.primary }} /> : null}
                  {growing || growIn ? (
                    <Animated.View style={{
                      height: 4, backgroundColor: t.primary,
                      // 往下一格的那段只長一半：下一格還沒做，線停在路上，像參考圖那樣「正在往前」
                      width: (growIn ? fill : line).interpolate({
                        inputRange: [0, 1], outputRange: ['0%', growIn || isDone(nextNode) ? '100%' : '55%'],
                      }),
                    }} />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Node({ done, justNow, isNext, n, fill }: {
  done: boolean; justNow: boolean; isNext: boolean; n: number; fill: Animated.Value;
}) {
  const t = useTheme();
  const base = { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (justNow) {
    // 先是空心圈，fill 跑到 1 時「蓋章」成實心打勾
    return (
      <View style={[base, { borderWidth: 2.5, borderColor: t.primary, backgroundColor: '#FFFFFF' }]}>
        <Animated.View style={[base, {
          position: 'absolute', backgroundColor: t.primary,
          opacity: fill, transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        }]}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </Animated.View>
      </View>
    );
  }
  if (done) return <View style={[base, { backgroundColor: t.primary }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>;
  if (isNext) {
    return (
      <View style={[base, { backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: t.primary }]}>
        <T style={{ fontSize: 15, fontWeight: '800' }} color={t.primary}>{n}</T>
      </View>
    );
  }
  return (
    <View style={[base, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: t.line }]}>
      <T style={{ fontSize: 14, fontWeight: '700' }} color={t.faint}>{n}</T>
    </View>
  );
}
