import { View } from 'react-native';
import { Screen, T, Card, Rule, ProgressBar } from '../ui';
import { PageHeader } from '../ui/brand';
import { RankSeal } from '../ui/RankSeal';
import { useTheme, space, fonts, radius } from '../theme';
import { useData } from '../state/data';
import { ranks, rankState } from '../lib/rank';

/**
 * 全部段位一覽。
 *
 * 入口是「我的」和首頁那條段位列——使用者看到「Lv.1 癸」會想知道
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
      <PageHeader ja="だんい" title="段位" subtitle="XP 累積換來的成就，每一段都對應一個在日本搞得定的場面。和「日語程度」是兩件事——程度是你自己選的難度，段位是練出來的。" />

      <Card tone="soft" style={{ marginTop: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <RankSeal n={r.rank.n} kanji={r.rank.kanji} size={52} />
          <View style={{ flex: 1 }}>
            <T variant="caption" color={t.faint}>目前 LV.{r.rank.n} / {ranks.length}</T>
            <T style={{ fontSize: 20, fontFamily: fonts.serif, marginTop: 1 }} color={t.heading}>{r.rank.name}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.6 }} color={t.heading}>{xp}</T>
            <T variant="caption" color={t.sub}>XP</T>
          </View>
        </View>
        {/* 量尺放在最顯眼的地方：使用者想知道的是「Lv.3 到底算什麼程度」，答案是一個場景 */}
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <SceneLine label="現在的你" scene={r.rank.scene} strong />
          {r.next ? <SceneLine label="下一段" scene={r.next.scene} /> : null}
        </View>
        <View style={{ marginTop: space.lg }}>
          {/* 預設軌道和淺灰卡同色，會看不出還差多少；換成白的 */}
          <ProgressBar value={r.pct} height={8} track={t.surface2} />
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
              style={here ? { borderWidth: 2, borderColor: t.primary } : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {/* 還沒到的段位只淡化文字、章維持原色：
                   整張卡半透明的話高段的金色會褪成米色，一路往下看不出章越來越華麗 */}
                <RankSeal n={x.n} kanji={x.kanji} size={46} />
                <View style={{ flex: 1, opacity: done ? 1 : 0.55 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <T style={{ fontSize: 14, fontWeight: '800', letterSpacing: -0.3 }} color={t.heading}>Lv.{x.n}</T>
                    <T style={{ fontSize: 17, fontFamily: fonts.serifMedium }} color={t.heading}>{x.name}</T>
                  </View>
                  <T style={{ fontSize: 14, fontWeight: '700', marginTop: 3 }} color={done ? t.primary : t.ink}>{x.scene}</T>
                  <T variant="caption" color={t.sub} style={{ marginTop: 1 }}>{x.desc}</T>
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
      <T variant="small" color={t.sub} style={{ marginTop: space.lg, lineHeight: 21 }}>
        {'每一段的場景是「練到這裡大概搞得定」的參考，看的是練習量，不是檢定成績。'}
      </T>
      {/* XP 怎麼算要講清楚，不然使用者會以為每堂課都一樣分 */}
      <T variant="small" color={t.sub} style={{ marginTop: space.sm, lineHeight: 21 }}>
        {'XP 依課程難度加權：基本說法最低，道地說法、情境練習依序往上，AI 會話最高；標為「進階」的主題再多 15%。'}
      </T>
    </Screen>
  );
}

/** 「現在的你／下一段」那兩行：酒紅圓角方形標籤＋場景，和課程完成頁的成績標籤同一套 */
function SceneLine({ label, scene, strong }: { label: string; scene: string; strong?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ width: 64, alignItems: 'center', paddingVertical: 4, borderRadius: radius.sm,
        backgroundColor: strong ? t.primary : t.primarySoft }}>
        <T style={{ fontSize: 11, fontWeight: '800' }} color={strong ? t.onPrimary : t.primary}>{label}</T>
      </View>
      <T style={{ flex: 1, fontSize: 14, fontWeight: strong ? '800' : '600' }} color={strong ? t.ink : t.sub}>{scene}</T>
    </View>
  );
}
