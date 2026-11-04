import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TopBar, WineCard } from '../ui/brand';
import { Screen, Sheet, T, Card, Pill, RoundButton, Avatar, SectionTitle, StationSign } from '../ui';
import { TopicThumb } from '../ui/seal';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { useAuth } from '../state/auth';
import { topics, categories } from '../content/topics';
import { photoFor, uiPhotos } from '../ui/images';
import { RootStack } from '../navigation';
import { planById } from '../content/plans';

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress, profile } = useData();
  const a = useAuth();
  const [cat, setCat] = useState<CatFilter>('all');
  const list = cat === 'all' ? topics : topics.filter(x => x.cat === cat);
  const name = profile.nickname || a.user?.displayName || '';
  const plan = planById(profile.plan);
  const goTab = (screen: string) => (nav as any).navigate('Tabs', { screen });

  return (
    <Screen shell padded={false}>
      {/* 深色殼：和首頁同一套骨架——殼 → 酒紅大卡 → 白面板往上疊 */}
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.section }}>
        {/* TopBar 的左右欄固定 44pt，塞寬的 Pill 進去字會被擠成直排。
            這裡和首頁放一樣的 44pt 頭像，整條的高度和留白才對得上。
            AI 額度移到卡片裡——那裡才有寬度把單位講清楚。 */}
        <TopBar right={<Avatar name={name || '學'} size={44} onPress={() => goTab('Me')} bg={t.gold} fg="#231A08" />} />

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

          {/* 額度：只寫「剩幾次」看不出一次是什麼，所以把計算方式寫在旁邊。
              整條可以點——次數見底時，使用者第一個想知道的就是怎麼拿到更多 */}
          <Pressable accessibilityRole="button" accessibilityLabel="查看方案與用量"
            onPress={() => nav.navigate('Plans')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.sm,
              marginTop: space.md, opacity: pressed ? 0.7 : 1 })}>
            <Pill icon="flash"
              label={progress.aiRemaining !== null ? `今日還有 ${progress.aiRemaining} 次` : `${plan.name}方案`}
              color="#FFFFFF" bg="rgba(255,255,255,0.16)" />
            <T variant="caption" color="rgba(255,255,255,0.55)" style={{ flex: 1 }}>
              每則 AI 回覆、每份分析各算一次
            </T>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.55)" />
          </Pressable>
        </WineCard>
      </View>

      <Sheet>
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
