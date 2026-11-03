import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressRing, Pill, SectionTitle, StationSign, Row, Divider, IconBox, IconName } from '../ui';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { nextLesson, lessonRef, recommendedTopics, topicProgress } from '../content/curriculum';
import { categories } from '../content/topics';
import { slang, todaySlangIndex } from '../content/slang';
import { RootStack } from '../navigation';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'こんばんは' : h < 11 ? 'おはよう' : h < 18 ? 'こんにちは' : 'こんばんは';
}

export default function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const d = useData();
  const { progress, profile } = d;

  const resumeRef = progress.resume ? lessonRef(progress.resume.lessonId) : undefined;
  const next = resumeRef ?? nextLesson(progress.completed, profile.goal, profile.startLevel);
  const xpToday = d.todayXp();
  const goalPct = xpToday / profile.dailyGoal;
  const due = d.dueWords().length;
  const recs = recommendedTopics(profile.goal, profile.startLevel, progress.completed, 8);
  const chatTopic = recs[0];
  const w = slang[todaySlangIndex()];
  const cat = next.topic ? categories.find(c => c.id === next.topic!.cat)?.title : '基礎';
  const tp = topicProgress(next.topic?.id ?? 'basics', progress.completed);

  const open = () => next.lesson.kind === 'ai'
    ? nav.navigate('Chat', { scenarioId: next.lesson.scenarioId!, lessonId: next.lesson.id })
    : nav.navigate('Lesson', { lessonId: next.lesson.id });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <T variant="small" color={t.sub}>{greeting()}！</T>
          <T variant="title" style={{ marginTop: 2 }}>今天想學什麼？</T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill icon="flame" label={`${d.streak()}`} color={t.primary} bg={t.primarySoft} />
          <Pill icon="star" label={`${progress.xp}`} color={t.warning} bg={t.warningSoft} />
        </View>
      </View>

      <Card style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: t.primary, borderColor: t.primary }}>
        <ProgressRing value={goalPct} color="#FFFFFF" track="rgba(255,255,255,0.28)">
          <T style={{ fontWeight: '800' }} color="#FFFFFF">{Math.min(100, Math.round(goalPct * 100))}%</T>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <T variant="heading" color="#FFFFFF">今日目標</T>
          <T variant="small" color="rgba(255,255,255,0.88)" style={{ marginTop: 4 }}>
            {goalPct >= 1 ? '達成了！繼續保持連續天數' : `${xpToday} / ${profile.dailyGoal} XP，還差 ${profile.dailyGoal - xpToday} XP`}
          </T>
        </View>
      </Card>

      <SectionTitle title={resumeRef ? '繼續上次的進度' : '下一站'} action="所有主題" onAction={() => (nav as any).navigate('Tabs', { screen: 'Course' })} />
      <Card>
        <StationSign compact kana={next.group} zh={cat ?? ''} bar={next.lesson.title} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
          <Ionicons name={next.lesson.kind === 'ai' ? 'sparkles' : 'time-outline'} size={15} color={t.sub} />
          <T variant="small" color={t.sub} style={{ flex: 1 }} numberOfLines={1}>{next.lesson.subtitle} · 約 {next.lesson.minutes} 分鐘</T>
          <T variant="caption" color={t.faint}>{tp.done}/{tp.total}</T>
        </View>
        <Button label={resumeRef ? '繼續學習' : '開始'} icon="play" style={{ marginTop: space.lg }} onPress={open} />
      </Card>

      <SectionTitle title="為你推薦的主題" action="更多" onAction={() => (nav as any).navigate('Tabs', { screen: 'Course' })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}>
        {recs.map(r => (
          <Card key={r.id} onPress={() => nav.navigate('Topic', { topicId: r.id })} accessibilityLabel={r.title} style={{ width: 140, padding: space.md }}>
            <IconBox name={r.icon as IconName} color={t.primary} bg={t.primarySoft} />
            <T style={{ fontWeight: '800', marginTop: space.md }} numberOfLines={1}>{r.title}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{r.focus}</T>
          </Card>
        ))}
      </ScrollView>

      <SectionTitle title="今日計畫" />
      <Card style={{ paddingVertical: space.xs }}>
        <Row icon="book-outline" iconColor={t.primary} iconBg={t.primarySoft} title="完成一堂課" subtitle={`${next.group}・${next.lesson.title}`} onPress={open} />
        <Divider />
        <Row icon="repeat-outline" iconColor={t.success} iconBg={t.successSoft} title={due ? `複習 ${due} 個單字` : '單字都複習完了'}
          subtitle={due ? '間隔複習，記得更久' : '收藏新單字會出現在這裡'} onPress={due ? () => nav.navigate('Review') : undefined}
          right={due ? undefined : <Ionicons name="checkmark-circle" size={22} color={t.success} />} />
        {chatTopic ? <>
          <Divider />
          <Row icon="sparkles-outline" iconColor={t.primary} iconBg={t.primarySoft} title="AI 實戰會話" subtitle={`推薦：${chatTopic.title}`}
            onPress={() => nav.navigate('Chat', { scenarioId: `t-${chatTopic.id}` })} />
        </> : null}
      </Card>

      <SectionTitle title="今日流行語" action="更多" onAction={() => nav.navigate('Slang')} />
      <Card onPress={() => nav.navigate('Slang')} accessibilityLabel={`今日流行語 ${w.word}`}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <T style={{ fontSize: 26, fontWeight: '800' }}>{w.word}</T>
          <T variant="small" color={t.sub}>{w.reading}</T>
        </View>
        <T style={{ marginTop: 6, fontWeight: '600' }}>{w.meaning}</T>
        <T variant="small" color={t.sub} style={{ marginTop: 6 }}>{w.example}　{w.exampleZh}</T>
      </Card>
    </Screen>
  );
}
