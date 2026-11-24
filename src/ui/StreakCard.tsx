import { useState } from 'react';
import { View, Text } from 'react-native';
import { Pressable } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { T, Pill } from '.';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { today, addDays } from '../lib/date';
import { weekCells, nextMilestone, MILESTONES, FREEZE_EVERY } from '../lib/streak';
import { checkinXp } from '../lib/rank';

/**
 * 首頁的「連續學習＋簽到」卡。
 *
 * 給的是**明天回來的理由**：週曆上今天那格還空著、再幾天到下一個里程碑、手上有幾張保護卡。
 * 簽到放在同一張卡上而不是另開一塊：兩件事都是「今天的我」，拆開只是多一個區塊要滑過。
 *
 * 底用米色卡，不用飽和色——那塊已經是酒紅大卡的（theme.ts 規則 4）。
 * 但格子和標籤用**酒紅圓角方形**：和課程完成頁的成績標籤、單元進度條同一套語言，
 * 讓「我今天練了」在首頁和完成頁長得一樣。圓角方形是這類「戰績」專用，狀態 Pill 照舊是膠囊。
 */
export default function StreakCard() {
  const t = useTheme();
  const d = useData();
  const p = d.progress;
  const streak = d.streak();
  const td = today();
  const learnedToday = p.lastDay === td;
  const cells = weekCells(p, td);
  const next = nextMilestone(streak);
  const hit = learnedToday && MILESTONES.includes(streak);
  // 保護卡剛補過昨天、今天還沒練：要讓他知道紀錄是被救回來的，不然會以為自己沒斷過
  const savedByFreeze = !learnedToday && p.frozenDays.includes(addDays(-1)) && streak > 0;
  // 剛按下簽到的那一刻顯示拿到幾分；重開 App 就不用再講
  const [gained, setGained] = useState(0);

  const status = hit ? `連續 ${streak} 天達成！`
    : savedByFreeze ? '保護卡幫你補上了沒練的那天，今天練一堂就接下去'
    : learnedToday ? (next ? `今天練過了，再 ${next - streak} 天到 ${next} 天` : '今天練過了')
    : streak > 0 ? `今天還沒練，上一堂課或複習單字就接到第 ${streak + 1} 天`
    : '完成一堂課，開始新的連續紀錄';

  // 下一次簽到是第幾次、拿幾分：第 7 次給大的，事先寫出來才有「明天再來」的理由
  const nth = p.checkins + (d.checkedInToday ? 0 : 1);
  const upcoming = checkinXp(nth);
  const toSeventh = 7 - (p.checkins % 7);

  return (
    <View style={{ backgroundColor: t.cream, borderRadius: radius.xl, padding: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
          backgroundColor: streak > 0 ? t.primary : '#FFFFFF' }}>
          <Ionicons name="flame" size={22} color={streak > 0 ? '#FFFFFF' : t.faint} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="eyebrow" color={t.primary} style={{ letterSpacing: 1 }}>連續學習</T>
          <T variant="title" color={t.heading} numberOfLines={1}>{streak} 天</T>
        </View>
        {/* 按鈕只放在這裡：簽到是今天唯一一件「按一下就完成」的事，要在第一眼就看得到 */}
        {d.checkedInToday
          ? <View style={{ alignItems: 'flex-end' }}>
              <Pill square icon="checkmark" label={gained ? `+${gained} XP` : '已簽到'} color={t.onPrimary} bg={t.primary} />
              <T variant="caption" color={t.faint} style={{ marginTop: 4 }}>累計第 {p.checkins} 天</T>
            </View>
          : <Pressable tapId="簽到" accessibilityRole="button" accessibilityLabel={`簽到，獲得 ${upcoming} XP`}
              onPress={() => setGained(d.checkin())}
              style={({ pressed }) => ({ backgroundColor: upcoming > checkinXp(1) ? t.gold : t.primary, borderRadius: radius.sm,
                paddingVertical: 10, paddingHorizontal: 16, opacity: pressed ? 0.8 : 1, alignItems: 'center' })}>
              <Text style={{ color: upcoming > checkinXp(1) ? '#231A08' : '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                簽到 +{upcoming}
              </Text>
            </Pressable>}
      </View>

      {/* 本週一到日 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg }}>
        {cells.map(c => {
          const look = {
            done: { bg: t.primary, icon: 'flame' as const, fg: '#FFFFFF', border: 'transparent' },
            frozen: { bg: t.primarySoft, icon: 'snow' as const, fg: t.primary, border: 'transparent' },
            today: { bg: '#FFFFFF', icon: null, fg: t.primary, border: t.primary },
            missed: { bg: '#FFFFFF', icon: null, fg: t.faint, border: 'transparent' },
            future: { bg: '#FFFFFF', icon: null, fg: t.faint, border: 'transparent' },
          }[c.state];
          return (
            <View key={c.day} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: look.bg,
                borderWidth: look.border === 'transparent' ? 0 : 2, borderColor: look.border,
                alignItems: 'center', justifyContent: 'center' }}>
                {look.icon ? <Ionicons name={look.icon} size={16} color={look.fg} /> : null}
              </View>
              <Text style={{ fontSize: 12, fontWeight: c.day === td ? '800' : '500', color: c.day === td ? t.ink : t.sub }}>
                {c.label}
              </Text>
            </View>
          );
        })}
      </View>

      <T variant="small" color={hit ? t.primary : t.ink} style={{ marginTop: space.lg, fontWeight: hit ? '800' : '600' }}>
        {status}
      </T>

      {/* Pill 要包一層 row，不然會被拉成整行寬 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
        <Pill square icon="snow" label={`保護卡 ×${p.freezes}`} color={t.onPrimary} bg={t.primary} />
        <Pill square icon="calendar" label={toSeventh === 7 && d.checkedInToday ? '第 7 次簽到 +25 拿到了' : `再簽 ${toSeventh} 次 +25`}
          color={t.primary} bg={t.primarySoft} />
      </View>
      <T variant="caption" color={t.faint} style={{ marginTop: space.sm }}>
        {`每連續 ${FREEZE_EVERY} 天送一張保護卡，漏掉一天會自動用掉，紀錄不會斷。`}
      </T>
    </View>
  );
}
