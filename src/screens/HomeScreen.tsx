import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressRing, ProgressBar, Pill, SectionTitle, StationSign, Row, Divider } from '../ui';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { nextLesson, levelProgress, lessonRef } from '../content/curriculum';
import { slang, todaySlangIndex } from '../content/slang';
import { scenarios } from '../content/scenarios';
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
  const next = resumeRef ?? nextLesson(progress.completed, profile.startLevel);
  const xpToday = d.todayXp();
  const goalPct = xpToday / profile.dailyGoal;
  const due = d.dueWords().length;
  const lp = levelProgress(next.level.id, progress.completed);
  const w = slang[todaySlangIndex()];
  const rec = scenarios.find(s => s.level === (profile.startLevel === 'L1' ? 'L2' : profile.startLevel)) ?? scenarios[0];

  const open = () => next.lesson.kind === 'ai'
    ? nav.navigate('Chat', { scenarioId: next.lesson.scenarioId!, lessonId: next.lesson.id })
    : nav.navigate('Lesson', { lessonId: next.lesson.id });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <T variant="small" color={t.sub}>{greeting()}！</T>
          <T variant="title" style={{ marginTop: 2 }}>今天也來練一站吧</T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill icon="flame" label={`${d.streak()}`} color={t.accent} bg={t.accentSoft} />
          <Pill icon="star" label={`${progress.xp}`} color={t.warning} bg={t.warningSoft} />
        </View>
      </View>

      {/* 今日目標 */}
      <Card style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <ProgressRing value={goalPct} color={goalPct >= 1 ? t.success : t.primary}>
          <T style={{ fontWeight: '800' }}>{Math.min(100, Math.round(goalPct * 100))}%</T>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <T variant="heading">今日目標</T>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>
            {goalPct >= 1 ? '達成了！繼續保持連續天數' : `${xpToday} / ${profile.dailyGoal} XP，還差 ${profile.dailyGoal - xpToday} XP`}
          </T>
        </View>
      </Card>

      {/* 繼續學習 */}
      <SectionTitle title={resumeRef ? '繼續上次的進度' : '下一站'} action="全部課程" onAction={() => nav.navigate('Tabs' as any, { screen: 'Course' })} />
      <Card>
        <StationSign compact kana={next.unit.title} zh={`${next.level.title} · ${next.level.jlpt}`} bar={next.lesson.title} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
          <Ionicons name={next.lesson.kind === 'ai' ? 'sparkles' : 'time-outline'} size={15} color={t.sub} />
          <T variant="small" color={t.sub} style={{ flex: 1 }} numberOfLines={1}>
            {next.lesson.kind === 'ai' ? 'AI 實戰會話' : `${next.lesson.steps.length} 個步驟`} · 約 {next.lesson.minutes} 分鐘
          </T>
        </View>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={lp.done / lp.total} color={t.success} />
          <T variant="caption" color={t.faint} style={{ marginTop: 6 }}>{next.level.title}進度 {lp.done}/{lp.total}</T>
        </View>
        <Button label={resumeRef ? '繼續學習' : '開始'} icon="play" variant="accent" style={{ marginTop: space.lg }} onPress={open} />
      </Card>

      {/* 今日計畫 */}
      <SectionTitle title="今日計畫" />
      <Card style={{ paddingVertical: space.xs }}>
        <Row icon="book-outline" iconColor={t.primary} iconBg={t.primarySoft} title="完成一堂課" subtitle={next.lesson.title} onPress={open} />
        <Divider />
        <Row icon="repeat-outline" iconColor={t.success} iconBg={t.successSoft} title={due ? `複習 ${due} 個單字` : '單字都複習完了'}
          subtitle={due ? '間隔複習，記得更久' : '收藏新單字會出現在這裡'} onPress={due ? () => nav.navigate('Review') : undefined}
          right={due ? undefined : <Ionicons name="checkmark-circle" size={22} color={t.success} />} />
        <Divider />
        <Row icon="sparkles-outline" iconColor={t.accent} iconBg={t.accentSoft} title="AI 實戰會話" subtitle={`推薦：${rec.title}`}
          onPress={() => nav.navigate('Chat', { scenarioId: rec.id })} />
      </Card>

      {/* 今日流行語 */}
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
