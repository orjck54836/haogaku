import { View } from 'react-native';
import { Screen, T, Card, Rule, ProgressBar } from '../ui';
import { PageHeader } from '../ui/brand';
import { Seal } from '../ui/seal';
import { useTheme, space, fonts } from '../theme';
import { useData } from '../state/data';
import { ranks, rankState } from '../lib/rank';

/**
 * 全部段位一覽。
 *
 * 入口是「我的」和首頁那條段位列——使用者看到「Lv.1 旅人」會想知道
 * 後面還有什麼、要練到什麼時候，但原本那條只講得出下一段差幾 XP。
 * 十段一次攤開，才看得出這是一條有終點的路（而不是無止境的數字）。
 *
 * 已達成和未達成用**飽和度**分，不用鎖頭圖示：
 * 這不是付費牆，沒有「被擋住」的東西，只是還沒走到。
 */
export default function RanksScreen() {
  const t = useTheme();
  const d = useData();
  const xp = d.progress.xp;
  const r = rankState(xp);

  return (
    // 這一頁有系統 header，再吃一次 top 的 safe area 會在標題上方多出一大塊空白
    <Screen edges={[]}>
      <PageHeader ja="だんい" title="段位" subtitle="XP 累積換來的成就。和「日語程度」是兩件事——程度是你自己選的難度，段位是練出來的。" />

      <Card tone="soft" style={{ marginTop: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Seal kanji={r.rank.kanji} size={52} tone="wine" />
          <View style={{ flex: 1 }}>
            <T variant="caption" color={t.faint}>目前 LV.{r.rank.n} / {ranks.length}</T>
            <T style={{ fontSize: 20, fontFamily: fonts.serif, marginTop: 1 }} color={t.heading}>{r.rank.name}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.6 }} color={t.heading}>{xp}</T>
            <T variant="caption" color={t.sub}>XP</T>
          </View>
        </View>
        <View style={{ marginTop: space.lg }}>
          <ProgressBar value={r.pct} height={8} />
          <T variant="caption" color={t.sub} style={{ marginTop: 6 }}>
            {r.next ? `還差 ${r.toNext} XP 升上 Lv.${r.next.n} ${r.next.name}` : '已經是最高段位'}
          </T>
        </View>
      </Card>

      <View style={{ marginTop: space.section, gap: space.md }}>
        {ranks.map(x => {
          const done = xp >= x.at;
          const here = x.n === r.rank.n;
          return (
            <Card key={x.n} tone={here ? 'surface' : 'soft'}
              style={here ? { borderWidth: 2, borderColor: t.primary } : { opacity: done ? 1 : 0.55 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {/* 還沒到的段位用淺色章：資訊都看得到，但不會跟已達成的搶注意力 */}
                <Seal kanji={x.kanji} size={46} tone={done ? (here ? 'wine' : 'ink') : 'soft'} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <T style={{ fontSize: 14, fontWeight: '800', letterSpacing: -0.3 }} color={t.heading}>Lv.{x.n}</T>
                    <T style={{ fontSize: 17, fontFamily: fonts.serifMedium }} color={t.heading}>{x.name}</T>
                  </View>
                  <T variant="small" color={t.sub} style={{ marginTop: 2, lineHeight: 20 }}>{x.desc}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="caption" color={here ? t.primary : t.faint} style={{ fontWeight: '700' }}>
                    {here ? '目前' : x.at === 0 ? '起點' : `${x.at} XP`}
                  </T>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ marginTop: space.section }}><Rule /></View>
      {/* XP 怎麼算要講清楚，不然使用者會以為每堂課都一樣分 */}
      <T variant="small" color={t.sub} style={{ marginTop: space.lg, lineHeight: 21 }}>
        {'XP 依課程難度加權：基本說法最低，道地說法、情境練習依序往上，AI 會話最高；標為「進階」的主題再多 15%。'}
      </T>
    </Screen>
  );
}
