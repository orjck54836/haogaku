import { useEffect, useLayoutEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, IconBox, Pill, IconName } from '../ui';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { topicById, categories } from '../content/topics';
import { topicLessons, basics, BASICS_ID, fitsLevel, levelLabels } from '../content/curriculum';
import { Lesson } from '../content/types';
import { StackProps } from '../navigation';
import { prefetchLesson } from '../lib/ai';

const kindIcon: Record<Lesson['kind'], IconName> = { kana: 'text-outline', vocab: 'albums-outline', scene: 'book-outline', gen: 'book-outline', ai: 'sparkles' };
const genIcon: Record<string, IconName> = { basic: 'book-outline', native: 'chatbubbles-outline', practice: 'headset-outline' };

export default function TopicScreen({ route, navigation }: StackProps<'Topic'>) {
  const t = useTheme();
  const { progress, profile } = useData();
  const isBasics = route.params.topicId === BASICS_ID;
  const topic = isBasics ? undefined : topicById(route.params.topicId);

  useLayoutEffect(() => { navigation.setOptions({ title: isBasics ? '五十音基礎' : topic?.title ?? '' }); }, []);
  useEffect(() => {
    if (!topic) return;
    for (const k of ['basic', 'native', 'practice'] as const) prefetchLesson(topic, k, profile.startLevel);
  }, [topic?.id]);

  function open(l: Lesson) {
    if (l.kind === 'ai') navigation.navigate('Chat', { scenarioId: l.scenarioId!, lessonId: l.id });
    else navigation.navigate('Lesson', { lessonId: l.id });
  }

  const row = (l: Lesson, label?: string) => {
    const done = progress.completed.includes(l.id);
    const ai = l.kind === 'ai';
    return (
      <Pressable key={l.id} accessibilityRole="button" onPress={() => open(l)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
          backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: ai ? t.primary : t.primarySoft }}>
          <Ionicons name={l.genKind ? genIcon[l.genKind] : kindIcon[l.kind]} size={21} color={ai ? t.onPrimary : t.primary} />
        </View>
        <View style={{ flex: 1 }}>
          {label ? <T variant="caption" color={t.primary}>{label}</T> : null}
          <T style={{ fontWeight: '800' }} numberOfLines={1}>{l.title}</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{l.subtitle} · {l.minutes} 分鐘</T>
        </View>
        <Ionicons name={done ? 'checkmark-circle' : 'play-circle'} size={28} color={done ? t.success : t.primary} />
      </Pressable>
    );
  };

  if (isBasics) {
    return (
      <Screen edges={['bottom']}>
        <Card onPress={() => navigation.navigate('KanaChart')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconBox name="grid-outline" color={t.primary} bg={t.primarySoft} />
          <T style={{ flex: 1, fontWeight: '700' }}>五十音表</T>
          <Ionicons name="chevron-forward" size={18} color={t.faint} />
        </Card>
        {basics.map(u => (
          <View key={u.id} style={{ marginTop: space.xxl, gap: space.sm }}>
            <T variant="heading">{u.title}</T>
            <T variant="caption" color={t.sub} style={{ marginBottom: space.xs }}>{u.description}</T>
            {u.lessons.map(l => row(l))}
          </View>
        ))}
      </Screen>
    );
  }

  if (!topic) return null;
  const cat = categories.find(c => c.id === topic.cat);
  const lessons = topicLessons(topic);
  const labels = ['第 1 堂', '第 2 堂', '第 3 堂'];

  return (
    <Screen edges={['bottom']}>
      <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
        <IconBox name={topic.icon as IconName} color={t.primary} bg={t.primarySoft} size={68} />
        <T variant="caption" color={t.primary} style={{ marginTop: space.md }}>{cat?.title}</T>
        <T variant="title" style={{ marginTop: 2 }}>{topic.title}</T>
        <T color={t.sub} style={{ marginTop: space.sm, textAlign: 'center', lineHeight: 22 }}>{topic.focus}</T>
        {!fitsLevel(topic, profile.startLevel) && topic.minLevel ? (
          <View style={{ marginTop: space.md }}><Pill icon="information-circle-outline" label={`建議程度：${levelLabels[topic.minLevel]}`} color={t.warning} bg={t.warningSoft} /></View>
        ) : null}
      </View>

      <View style={{ gap: space.sm, marginTop: space.md }}>
        {lessons.map((l, i) => row(l, labels[i]))}
      </View>

      <Card onPress={() => navigation.navigate('Chat', { scenarioId: `t-${topic.id}` })} accessibilityLabel="到 AI 教練練習這個情境"
        style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: t.surface2, borderColor: t.surface2 }}>
        <Ionicons name="sparkles-outline" size={20} color={t.primary} />
        <View style={{ flex: 1 }}>
          <T variant="small" style={{ fontWeight: '700' }}>學完想開口練習？</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>到 AI 教練用這個情境實際對話</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.faint} />
      </Card>
    </Screen>
  );
}
