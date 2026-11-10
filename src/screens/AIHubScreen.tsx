import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TopBar, WineCard } from '../ui/brand';
import { PlanButton } from '../ui/PlanButton';
import { Screen, Sheet, T, Card, RoundButton, SectionTitle, StationSign, IconBox } from '../ui';
import { TopicThumb } from '../ui/seal';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import { useTheme, space, radius } from '../theme';
import { useData, goalLabel } from '../state/data';
import { topics, categories } from '../content/topics';
import { photoFor, uiPhotos } from '../ui/images';
import { RootStack } from '../navigation';
import { whenLabel } from '../lib/date';

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const d = useData();
  const { reports } = d;

  /**
   * 和「自己去跟別的 AI 聊天」最大的差別就是這塊：那邊每開一個新對話都是初次見面，
   * 這裡的教練手上有你的名字、目的、前幾場聊過什麼和反覆出錯的地方
   * （實際送進 prompt 的內容見 ChatScreen 的 learner）。
   * 文案一律落在具體的東西上——寫「個人化學習」沒人會信，說得出「叫你ケン」才有感。
   */
  const jaName = d.profile.jaName || d.profile.nickname;
  // 中途離開的會話也算「聊過」：它一樣會留下記憶（見 lib/reports 的 ChatNote）
  const played = reports.length + d.progress.chatNotes.length;
  const memory = [
    jaName ? `叫你「${jaName}」` : null,
    goalLabel[d.profile.goal],
    played ? `前 ${Math.min(played, 3)} 場對話` : null,
    // 單字本排在自我介紹前面：它是這裡唯一「會出現在對話裡」的東西，最值得先講
    d.words.length ? `單字本的 ${Math.min(d.words.length, 6)} 個詞` : null,
    d.profile.intro ? '你的自我介紹' : null,
  ].filter(Boolean).slice(0, 3) as string[];
  const missing = !d.profile.intro || !d.profile.jaName;
  const [cat, setCat] = useState<CatFilter>('all');
  const list = cat === 'all' ? topics : topics.filter(x => x.cat === cat);

  return (
    <Screen shell padded={false}>
      {/* 深色殼：和首頁同一套骨架——殼 → 酒紅大卡 → 白面板往上疊 */}
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        {/* 和首頁放同一顆方案鈕：方案和今天剩的 AI 次數併在那一顆上 */}
        <TopBar right={<PlanButton />} />

        <WineCard style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T variant="small" color="rgba(255,255,255,0.72)">今天想練什麼？</T>
              <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>AI 日語教練</T>
            </View>
            <RoundButton icon="arrow-forward" accessibilityLabel="開始自由會話"
              onPress={() => nav.navigate('Chat', { scenarioId: 't-friends' })} />
          </View>

          <View style={{ marginTop: space.lg }}>
            <StationSign compact kana="自由會話" zh="フリートーク" bar="跟日本朋友 ゆい 聊天"
              barColor={t.shell} photo={uiPhotos.coach} />
          </View>

          {/* 整塊可以點：缺資料時去補，補齊了就去看他到底記得什麼（分析紀錄就是記憶的來源） */}
          <Pressable accessibilityRole="button"
            accessibilityLabel={missing ? '補上個人資料，讓教練更認識你' : '教練記得你的哪些事'}
            onPress={() => nav.navigate(missing ? 'EditProfile' : 'Reports')}
            style={({ pressed }) => ({
              marginTop: space.lg, paddingVertical: space.sm, paddingHorizontal: space.md,
              borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.12)',
              opacity: pressed ? 0.75 : 1,
            })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <T variant="small" color="#FFFFFF" style={{ flex: 1 }}>教練會依過去的對談記錄跟你的單字庫發起談話</T>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
            </View>
            <T variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} numberOfLines={1}>
              {memory.join('・')}
            </T>
          </Pressable>
        </WineCard>
      </View>

      <Sheet>
        {/* 分析紀錄只在有東西的時候出現——空的入口點進去是一片空白，
            而且會把真正要用的「情境會話」往下推一整塊 */}
        {reports.length ? (
          <Card onPress={() => nav.navigate('Reports')} accessibilityLabel="會話分析紀錄"
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
            <IconBox name="document-text-outline" color={t.primary} bg={t.primarySoft} />
            <View style={{ flex: 1 }}>
              <T variant="heading">會話分析紀錄</T>
              <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>
                {`${reports.length} 份・最近一次 ${whenLabel(reports[0].at)}`}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.faint} />
          </Card>
        ) : null}

        <SectionTitle title="情境會話" ja="シチュエーション"
          right={<T variant="small" color={t.faint}>{list.length} 個</T>} />
        <CategoryChips value={cat} onChange={setCat} />

        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {list.map(s => (
            <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.title}
              onPress={() => nav.navigate('Chat', { scenarioId: `t-${s.id}` })}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: space.md,
                paddingVertical: space.sm, opacity: pressed ? 0.65 : 1,
              })}>
              {/* 主題照片直接當縮圖——83 個主題都有圖，不用再退回通用圖示 */}
              <TopicThumb topicId={s.id} title={s.title} cat={s.cat} size={54} />
              <View style={{ flex: 1 }}>
                <T variant="heading" numberOfLines={1}>{s.title}</T>
                <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>任務：{s.goal}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
