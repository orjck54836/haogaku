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
import { useData } from '../state/data';
import { topics, categories } from '../content/topics';
import { photoFor, uiPhotos } from '../ui/images';
import { RootStack } from '../navigation';
import { whenLabel } from '../lib/date';

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { reports } = useData();
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

          <T variant="caption" color="rgba(255,255,255,0.72)" style={{ marginTop: space.lg }}>
            說錯不用怕，AI 會即時糾正並在結束後給你一份分析
          </T>

          {/* 剩餘次數已經在右上角那顆方案鈕上（同一件事不要兩處顯示），
              這裡只留「一次」是什麼——光看數字看不出單位。
              整條可以點：次數見底時，使用者第一個想知道的就是怎麼拿到更多 */}
          <Pressable accessibilityRole="button" accessibilityLabel="看次數怎麼算"
            onPress={() => nav.navigate('Quota')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.xs,
              marginTop: space.md, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="flash" size={13} color="rgba(255,255,255,0.55)" />
            <T variant="caption" color="rgba(255,255,255,0.55)" style={{ flex: 1 }}>
              每則 AI 回覆、每份分析各算一次
            </T>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.55)" />
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
