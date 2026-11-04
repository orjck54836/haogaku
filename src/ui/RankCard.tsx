import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { T, ProgressBar, Card } from './index';
import type { RootStack } from '../navigation';
import { Seal } from './seal';
import { useTheme, space, fonts } from '../theme';
import { rankState, ranks } from '../lib/rank';

/**
 * 段位卡。
 *
 * 總 XP 本來只是「我的」分頁裡四格小數字之一，看不出來有什麼用。
 * 換成段位之後，同一個數字變成「還差 120 XP 升 Lv.4」——
 * 有下一個目標，才會想再上一堂。
 *
 * 段位名用明體（它是日文），Lv. 數字用系統字重字重，和全 app 的規則一致。
 */

/**
 * 一行式：首頁白面板裡那條。深色背景上用 onDark。
 *
 * 整條可以點，進去看全部十段——「Lv.1 旅人」會讓人想知道後面還有什麼，
 * 但這條只講得出下一段差幾 XP。右邊補一個 chevron，不然看不出來能點。
 */
export function RankRow({ xp, onDark }: { xp: number; onDark?: boolean }) {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const r = rankState(xp);
  const fg = onDark ? '#FFFFFF' : t.ink;
  const sub = onDark ? 'rgba(255,255,255,0.7)' : t.sub;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`段位 Lv.${r.rank.n} ${r.rank.name}，查看所有段位`}
      onPress={() => nav.navigate('Ranks')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.7 : 1 })}>
      <Seal kanji={r.rank.kanji} size={44} tone={onDark ? 'gold' : 'wine'} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.3 }} color={fg}>Lv.{r.rank.n}</T>
          <T style={{ fontSize: 16, fontFamily: fonts.serifMedium }} color={fg}>{r.rank.name}</T>
        </View>
        <View style={{ marginTop: 6 }}>
          <ProgressBar value={r.pct} height={6}
            color={onDark ? '#FFFFFF' : t.primary} track={onDark ? 'rgba(255,255,255,0.25)' : t.surface2} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T variant="caption" color={sub}>{xp} XP</T>
        <T variant="caption" color={sub} style={{ marginTop: 1 }}>
          {r.next ? `還差 ${r.toNext} XP` : '已滿級'}
        </T>
      </View>
      <Ionicons name="chevron-forward" size={16} color={sub} />
    </Pressable>
  );
}

/** 「我的」分頁上面那張大的：段位、說明、下一段是什麼 */
export function RankCard({ xp }: { xp: number }) {
  const t = useTheme();
  const r = rankState(xp);
  return (
    <Card tone="soft">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Seal kanji={r.rank.kanji} size={58} tone="wine" />
        <View style={{ flex: 1 }}>
          <T variant="caption" color={t.faint}>LV.{r.rank.n} / {ranks.length}</T>
          <T style={{ fontSize: 22, fontFamily: fonts.serif, marginTop: 1 }} color={t.heading}>{r.rank.name}</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 2 }} numberOfLines={1}>{r.rank.desc}</T>
        </View>
      </View>

      <View style={{ marginTop: space.lg }}>
        <ProgressBar value={r.pct} height={8} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <T variant="caption" color={t.sub}>{xp} XP</T>
          {r.next
            ? <T variant="caption" color={t.sub}>
                還差 {r.toNext} XP → Lv.{r.next.n} {r.next.name}
              </T>
            : <T variant="caption" color={t.gold} style={{ fontWeight: '700' }}>最高段位</T>}
        </View>
      </View>
    </Card>
  );
}
