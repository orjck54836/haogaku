import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Pill, IconBox, SectionTitle, Segmented, IconName } from '../ui';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { scenarios } from '../content/scenarios';
import { Scenario } from '../content/types';
import { RootStack } from '../navigation';

type Cat = Scenario['category'];

export default function AIHubScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress } = useData();
  const [cat, setCat] = useState<Cat>('旅行');
  const list = scenarios.filter(s => s.category === cat);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <T variant="title">AI 日語教練</T>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>開口練習，AI 即時糾正與分析</T>
        </View>
        {progress.aiRemaining !== null ? (
          <Pill icon="flash" label={`今日剩 ${progress.aiRemaining} 次`} color={t.primary} bg={t.primarySoft} />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Card style={{ flex: 1 }} onPress={() => nav.navigate('Chat', { scenarioId: 'ai-free' })} accessibilityLabel="自由會話">
          <IconBox name="chatbubbles" color={t.accent} bg={t.accentSoft} />
          <T variant="heading" style={{ marginTop: space.md }}>自由會話</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 4 }}>跟日本朋友 ゆい 聊天</T>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => nav.navigate('Check')} accessibilityLabel="句子健檢">
          <IconBox name="shield-checkmark" color={t.success} bg={t.successSoft} />
          <T variant="heading" style={{ marginTop: space.md }}>句子健檢</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 4 }}>寫一句日文，AI 幫你改</T>
        </Card>
      </View>

      <Card style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBox name="analytics" color={t.primary} bg={t.primarySoft} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '700' }}>每場會話都有分析報告</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 3 }}>文法、用詞、禮貌程度、流暢度評分，並整理要記的句子</T>
        </View>
      </Card>

      <SectionTitle title="情境會話" />
      <Segmented<Cat> value={cat} onChange={setCat}
        options={[{ value: '旅行', label: '旅行' }, { value: '生活', label: '生活' }, { value: '職場', label: '職場' }]} />

      <View style={{ marginTop: space.md, gap: space.sm }}>
        {list.map(s => (
          <Card key={s.id} onPress={() => nav.navigate('Chat', { scenarioId: s.id })} accessibilityLabel={s.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
            <IconBox name={s.icon as IconName} color={t.primary} bg={t.primarySoft} size={46} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <T style={{ fontWeight: '800' }}>{s.title}</T>
                <T variant="caption" color={t.faint}>{s.level === 'L2' ? 'N5〜N4' : s.level === 'L3' ? 'N3〜N2' : 'N2〜N1'}</T>
              </View>
              <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>任務：{s.goal}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.faint} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
