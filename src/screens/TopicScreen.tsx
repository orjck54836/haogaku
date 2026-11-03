import { useEffect, useLayoutEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Pill, ProgressBar, RoundButton, SectionTitle } from '../ui';
import { Seal, BASICS_KANJI, TopicBanner, TopicThumb } from '../ui/seal';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { topicById, categories } from '../content/topics';
import { topicLessons, basics, BASICS_ID, KEIGO_ID, keigoTopics, topicProgress, fitsLevel, levelLabels } from '../content/curriculum';
import { Lesson } from '../content/types';
import { StackProps } from '../navigation';
import { prefetchLesson } from '../lib/ai';

export default function TopicScreen({ route, navigation }: StackProps<'Topic'>) {
  const t = useTheme();
  const { progress, profile } = useData();
  const id = route.params.topicId;
  const isBasics = id === BASICS_ID;
  const isKeigo = id === KEIGO_ID;
  const topic = isBasics || isKeigo ? undefined : topicById(id);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isBasics ? '五十音基礎' : isKeigo ? '敬語' : topic?.title ?? '' });
  }, []);
  useEffect(() => {
    if (!topic) return;
    for (const k of ['basic', 'native', 'practice'] as const) prefetchLesson(topic, k, profile.startLevel);
  }, [topic?.id]);

  function open(l: Lesson) {
    if (l.kind === 'ai') navigation.navigate('Chat', { scenarioId: l.scenarioId!, lessonId: l.id });
    else navigation.navigate('Lesson', { lessonId: l.id });
  }

  /** 一堂課：圓角淺灰磚，右邊一顆圓形播放鍵 */
  const lessonCard = (l: Lesson, num?: string) => {
    const done = progress.completed.includes(l.id);
    return (
      <Card key={l.id} tone="soft" onPress={() => open(l)} accessibilityLabel={l.title}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? t.success : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Ionicons name="checkmark" size={19} color="#FFFFFF" />
            : <T variant="caption" color={t.sub} style={{ fontWeight: '700' }}>{num}</T>}
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" numberOfLines={1}>{l.title}</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 2 }} numberOfLines={1}>{l.subtitle} · {l.minutes} 分鐘</T>
        </View>
        {l.kind === 'ai' ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel={`看「${l.title}」全部內容`} hitSlop={8}
            onPress={() => navigation.navigate('LessonContent', { lessonId: l.id })}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#FFFFFF' }}>
            <T variant="caption" color={t.sub} style={{ fontWeight: '600' }}>內容</T>
          </Pressable>
        )}
        <RoundButton icon="play" size={38} bg={t.primary} fg="#FFFFFF" onPress={() => open(l)} accessibilityLabel={`開始 ${l.title}`} />
      </Card>
    );
  };

  /** 底下掛主題的集合頁（敬語用） */
  const topicRow = (k: NonNullable<typeof topic>) => {
    const p = topicProgress(k.id, progress.completed);
    const advanced = !fitsLevel(k, profile.startLevel);
    return (
      <Card key={k.id} tone="soft" onPress={() => navigation.navigate('Topic', { topicId: k.id })} accessibilityLabel={k.title}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
        <TopicThumb topicId={k.id} title={k.title} cat={k.cat} size={46} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <T variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>{k.title}</T>
            {advanced && k.minLevel ? <Pill label="進階" color={t.sub} bg="#FFFFFF" /> : null}
          </View>
          <T variant="caption" color={t.sub} style={{ marginTop: 2, marginBottom: space.sm }} numberOfLines={2}>{k.focus}</T>
          <ProgressBar value={p.done / p.total} height={5} track="#FFFFFF" />
        </View>
        <T variant="caption" color={t.faint}>{p.done}/{p.total}</T>
      </Card>
    );
  };

  // 五十音基礎
  if (isBasics) {
    return (
      <Screen edges={['bottom']}>
        <TopicBanner title="五十音基礎" caption="ごじゅうおん" focus="日文的起點。從字源聯想記假名，再練到看懂招牌上的漢字。" />
        <Card tone="soft" onPress={() => navigation.navigate('KanaChart')} accessibilityLabel="五十音表"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl, padding: space.md }}>
          <Seal kanji={BASICS_KANJI} size={44} tone="ink" />
          <T variant="heading" style={{ flex: 1 }}>五十音表</T>
          <Ionicons name="chevron-forward" size={17} color={t.faint} />
        </Card>
        {basics.map(u => (
          <View key={u.id}>
            <SectionTitle title={u.title} />
            <T variant="small" color={t.sub} style={{ marginTop: -space.md, marginBottom: space.md }}>{u.description}</T>
            <View style={{ gap: space.sm }}>
              {u.lessons.map((l, i) => lessonCard(l, String(i + 1)))}
            </View>
          </View>
        ))}
      </Screen>
    );
  }

  // 敬語：和五十音並列的語言系統
  if (isKeigo) {
    return (
      <Screen edges={['bottom']}>
        <TopicBanner title="敬語" caption="けいご" cat="keigo"
          focus="敬語不是「更客氣的說法」，而是一套看關係決定語氣的系統。先弄懂三種敬語的分工，再分場合練。" />
        <SectionTitle title={`${keigoTopics.length} 個主題`} ja="けいごのトピック" />
        <View style={{ gap: space.sm }}>{keigoTopics.map(topicRow)}</View>
      </Screen>
    );
  }

  if (!topic) return null;
  const cat = categories.find(c => c.id === topic.cat);
  const lessons = topicLessons(topic);

  return (
    <Screen edges={['bottom']}>
      <TopicBanner topicId={topic.id} cat={topic.cat} title={topic.title} caption={cat?.title} focus={topic.focus} />

      {!fitsLevel(topic, profile.startLevel) && topic.minLevel ? (
        <View style={{ marginTop: space.lg, alignSelf: 'flex-start' }}>
          <Pill icon="information-circle" label={`建議程度：${levelLabels[topic.minLevel]}`} color={t.warning} bg={t.warningSoft} />
        </View>
      ) : null}

      <SectionTitle title="3 堂課" ja="レッスン" />
      <View style={{ gap: space.sm }}>
        {lessons.map((l, i) => lessonCard(l, String(i + 1)))}
      </View>

      <Card onPress={() => navigation.navigate('Chat', { scenarioId: `t-${topic.id}` })} accessibilityLabel="到 AI 教練練習這個情境"
        raised style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Seal kanji="話" size={46} tone="ink" />
        <View style={{ flex: 1 }}>
          <T variant="heading">學完想開口練習？</T>
          <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>到 AI 教練用這個情境實際對話</T>
        </View>
        <RoundButton icon="arrow-forward" size={40} bg={t.surface2}
          onPress={() => navigation.navigate('Chat', { scenarioId: `t-${topic.id}` })} accessibilityLabel="開始 AI 會話" />
      </Card>
    </Screen>
  );
}
