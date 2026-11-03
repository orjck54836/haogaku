import { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, IconBox, ProgressBar } from '../ui';
import CategoryChips, { CatFilter } from '../ui/CategoryChips';
import TopicCard from '../ui/TopicCard';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { topics, categories } from '../content/topics';
import { topicProgress, BASICS_ID, fitsLevel } from '../content/curriculum';
import { RootStack } from '../navigation';

export default function CourseScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress, profile } = useData();
  const [cat, setCat] = useState<CatFilter>('all');
  const kana = topicProgress(BASICS_ID, progress.completed);
  const doneTopics = topics.filter(x => topicProgress(x.id, progress.completed).done === 3).length;
  const sections = cat === 'all' ? categories : categories.filter(c => c.id === cat);

  return (
    <Screen>
      <T variant="title">生活主題</T>
      <T variant="small" color={t.sub} style={{ marginTop: 4 }}>
        {topics.length} 個主題，從吃飯到職場，學日本人真正會說的話
      </T>

      <Card onPress={() => nav.navigate('Topic', { topicId: BASICS_ID })} accessibilityLabel="五十音基礎"
        style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBox name="text" color={t.primary} bg={t.primarySoft} size={46} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '800' }}>五十音基礎</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 3, marginBottom: 8 }}>平假名、片假名、看懂招牌 · {kana.done}/{kana.total}</T>
          <ProgressBar value={kana.done / kana.total} />
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.faint} />
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.lg }}>
        <Ionicons name="ribbon-outline" size={16} color={t.primary} />
        <T variant="small" color={t.sub}>已完成 {doneTopics} / {topics.length} 個主題</T>
      </View>

      <View style={{ marginTop: space.lg }}>
        <CategoryChips value={cat} onChange={setCat} />
      </View>

      {sections.map(c => {
        const list = topics.filter(x => x.cat === c.id);
        const rows: typeof list[] = [];
        for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
        return (
          <View key={c.id} style={{ marginTop: space.xxl }}>
            <T variant="heading">{c.title}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2, marginBottom: space.md }}>{c.desc}</T>
            <View style={{ gap: space.md }}>
              {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
                  {r.map(tp => (
                    <TopicCard key={tp.id} topic={tp} completed={progress.completed} advanced={!fitsLevel(tp, profile.startLevel)}
                      onPress={() => nav.navigate('Topic', { topicId: tp.id })} />
                  ))}
                  {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
