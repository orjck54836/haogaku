import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TopBar, WineCard } from '../ui/brand';
import { Screen, Sheet, T, Card, Pill, RoundButton, SectionTitle, StationSign } from '../ui';
import { TopicThumb } from '../ui/seal';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { topics, categories } from '../content/topics';
import { photoFor, uiPhotos } from '../ui/images';
import { RootStack } from '../navigation';

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress } = useData();
  const [cat, setCat] = useState<CatFilter>('all');
  const list = cat === 'all' ? topics : topics.filter(x => x.cat === cat);

  return (
    <Screen shell padded={false}>
      {/* 深色殼：和首頁同一套骨架——殼 → 酒紅大卡 → 白面板往上疊 */}
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        <TopBar
          right={progress.aiRemaining !== null
            ? <Pill icon="flash" label={`今日剩 ${progress.aiRemaining} 次`} color="#FFFFFF" bg="rgba(255,255,255,0.14)" />
            : undefined} />

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
        </WineCard>
      </View>

      <Sheet>
        {/* 句子健檢：不是會話，所以獨立出來不要混在情境清單裡 */}
        <Card tone="soft" onPress={() => nav.navigate('Check')} accessibilityLabel="句子健檢"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 46, height: 46, borderRadius: radius.sm, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-checkmark" size={22} color={t.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading">句子健檢</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 3 }}>寫一句或說一句，AI 幫你改到自然</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.faint} />
        </Card>

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
