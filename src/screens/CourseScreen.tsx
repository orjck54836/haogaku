import { useState } from 'react';
import { View, ScrollView, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressBar, Eyebrow } from '../ui';
import { topicPhotos } from '../ui/images';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import LevelTabs from '../ui/LevelTabs';
import TopicCard from '../ui/TopicCard';
import { PageHeader } from '../ui/brand';
import { useTheme, space, radius, shadows } from '../theme';
import { useData } from '../state/data';
import { topicProgress, collectionMeta, foundationIds, fitsLevel, gridCategories, gridTopics } from '../content/curriculum';
import { Topic } from '../content/topics';
import { LevelId } from '../content/types';
import { RootStack } from '../navigation';

/**
 * 號碼版的長寬比循環（寬 ÷ 高）。
 * 刻意不一致，雙欄才會錯落而不是像表格；都設成橫幅比例，
 * 色版才不會壓過底下的文字（之後換成照片也是這個比例好看）。
 */
const ASPECTS = [1.35, 1.0, 1.15, 0.9];

/**
 * 頁籤底下的說明。
 * 用同一句日文的兩種說法當例子——光寫「比較難」沒有畫面，
 * 看到「お弁当、温めますか？」變成「あっためてください。」才知道換的是什麼。
 */
const levelCopy: Record<LevelId, { title: string; example: string }> = {
  L2: {
    title: '課程裡會用です・ます體的完整短句',
    example: '例：便利商店會學到「お弁当、温めますか？」「大丈夫です」',
  },
  L3: {
    title: '課程裡會換成日本人實際講的口語',
    example: '例：同一課變成「あっためてください。」「袋はご利用ですか？」',
  },
};

export default function CourseScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress, profile, setProfile } = useData();
  const [cat, setCat] = useState<CatFilter>('all');
  const doneTopics = gridTopics.filter(x => topicProgress(x.id, progress.completed).done === 3).length;
  const sections = cat === 'all' ? gridCategories : gridCategories.filter(c => c.id === cat);

  // banner 寬度留一點邊，第二張會露出來，暗示可以滑
  const bannerW = Dimensions.get('window').width - space.xl * 2 - space.xxl;

  /**
   * 語言基礎卡：四張，依程度顯示其中兩張（見 curriculum 的 foundationIds）。
   *
   * 文案和照片來自 collectionMeta，集合頁和首頁讀的是同一份。
   * 底色在這裡決定：同一排的兩張一定一酒紅一深色，不然並排滑過去
   * 分不出是兩張還是一張。
   */
  const foundations = foundationIds[profile.startLevel].map((id, i) => ({
    id, fg: '#FFFFFF',
    bg: i % 2 === 0 ? t.primary : t.shell,
    title: collectionMeta[id].title,
    desc: collectionMeta[id].desc,
    photo: topicPhotos[collectionMeta[id].photoKey],
  }));

  /** 把一個分類的主題分成左右兩欄，右欄往下推一點做出錯落感 */
  const grid = (list: Topic[], offset: number) => {
    const cols: Topic[][] = [[], []];
    list.forEach((x, i) => cols[i % 2].push(x));
    return (
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {cols.map((col, ci) => (
          <View key={ci} style={{ flex: 1, gap: space.md, paddingTop: ci === 1 ? space.xxl : 0 }}>
            {col.map((x, i) => (
              <TopicCard key={x.id} topic={x} completed={progress.completed}
                advanced={!fitsLevel(x, profile.startLevel)}
                aspect={ASPECTS[(offset + ci * 2 + i * 2) % ASPECTS.length]}
                onPress={() => nav.navigate('Topic', { topicId: x.id })} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <PageHeader ja="せいかつ" title="生活主題" subtitle={`${gridTopics.length} 個主題，從生活主題來學習日文`} />

      {/* 程度頁籤。原本在「我的 → 學習設定」裡，但它影響的是這一頁的
          「進階」標記和課程內容的難度，調整完要跳回來看結果——所以搬到它生效的地方。

          底下那張說明卡不是裝飾：切換之後主題清單長得一模一樣（只有「進階」標記會動），
          差別全在課程裡面，不講的話使用者會以為這兩格沒作用。 */}
      <View style={{ marginTop: space.xl }}>
        <LevelTabs value={profile.startLevel} onChange={v => setProfile({ startLevel: v })} />
      </View>

      {/* 語言基礎：橫向輪播，第二張露半邊 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md, paddingVertical: 12 }}
        snapToInterval={bannerW + space.md} decelerationRate="fast">
        {foundations.map(f => {
          const p = topicProgress(f.id, progress.completed);
          const started = p.done > 0;
          return (
            // 陰影在外、裁圖在內：overflow:'hidden' 和 iOS 陰影不能在同一層
            <View key={f.id} style={{ width: bannerW, borderRadius: radius.xl, ...shadows.md }}>
            <View style={{ backgroundColor: f.bg, borderRadius: radius.xl, overflow: 'hidden' }}>
              {f.photo ? <>
                <Image source={f.photo} resizeMode="cover"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: f.bg, opacity: 0.84 }} />
              </> : null}
              <View style={{ padding: space.xl }}>
              <View>
                <Eyebrow color="rgba(255,255,255,0.6)">Foundation</Eyebrow>
                <T variant="title" color={f.fg} style={{ fontSize: 22, marginTop: 1 }} numberOfLines={1}>{f.title}</T>
              </View>
              <T variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: space.md }} numberOfLines={2}>{f.desc}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg }}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={p.total ? p.done / p.total : 0} height={6}
                    color="#FFFFFF" track="rgba(255,255,255,0.25)" />
                </View>
                <T variant="caption" color="rgba(255,255,255,0.75)">{p.done}/{p.total}</T>
              </View>
              <Button size="md" label={started ? '繼續' : '開始'} variant="gold"
                style={{ marginTop: space.lg, alignSelf: 'flex-start', paddingHorizontal: 26, backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }}
                onPress={() => nav.navigate('Topic', { topicId: f.id })} />
              </View>
            </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.section, marginBottom: space.md }}>
        <T variant="kana" color={t.faint}>トピック</T>
        <T variant="caption" color={t.faint}>已完成 {doneTopics} / {gridTopics.length}</T>
      </View>
      <CategoryChips value={cat} onChange={setCat} />

      {sections.map((c, si) => {
        const list = gridTopics.filter(x => x.cat === c.id);
        return (
          <View key={c.id} style={{ marginTop: space.section }}>
            <T variant="heading" style={{ fontSize: 20 }}>{c.title}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2, marginBottom: space.lg }}>{c.desc}</T>
            {grid(list, si)}
          </View>
        );
      })}
    </Screen>
  );
}
