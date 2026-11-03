import { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Pill, IconBox, SectionTitle, IconName } from '../ui';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { topics } from '../content/topics';
import { RootStack } from '../navigation';

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress } = useData();
  const [cat, setCat] = useState<CatFilter>('food');
  const list = cat === 'all' ? topics : topics.filter(x => x.cat === cat);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T variant="title">AI 日語教練</T>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>開口練習，AI 即時糾正與分析</T>
        </View>
        {progress.aiRemaining !== null ? <Pill icon="flash" label={`今日剩 ${progress.aiRemaining} 次`} color={t.primary} bg={t.primarySoft} /> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Card style={{ flex: 1, backgroundColor: t.primary, borderColor: t.primary }} onPress={() => nav.navigate('Chat', { scenarioId: 't-friends' })} accessibilityLabel="自由會話">
          <IconBox name="chatbubbles" color={t.primary} bg="#FFFFFF" />
          <T variant="heading" color="#FFFFFF" style={{ marginTop: space.md }}>自由會話</T>
          <T variant="caption" color="rgba(255,255,255,0.88)" style={{ marginTop: 4 }}>跟日本朋友 ゆい 聊天</T>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => nav.navigate('Check')} accessibilityLabel="句子健檢">
          <IconBox name="shield-checkmark" color={t.primary} bg={t.primarySoft} />
          <T variant="heading" style={{ marginTop: space.md }}>句子健檢</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 4 }}>寫一句或說一句，AI 幫你改</T>
        </Card>
      </View>

      <SectionTitle title={`情境會話 · ${topics.length} 個`} />
      <CategoryChips value={cat} onChange={setCat} />

      <View style={{ marginTop: space.md, gap: space.sm }}>
        {list.map(s => (
          <Card key={s.id} onPress={() => nav.navigate('Chat', { scenarioId: `t-${s.id}` })} accessibilityLabel={s.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
            <IconBox name={s.icon as IconName} color={t.primary} bg={t.primarySoft} size={46} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '800' }}>{s.title}</T>
              <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>任務：{s.goal}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.faint} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
