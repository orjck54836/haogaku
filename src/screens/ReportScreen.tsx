import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressRing, ProgressBar, SectionTitle, Pill, Divider } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space } from '../theme';
import { scenarioById } from '../content/scenarios';
import { StackProps } from '../navigation';

const labels: Record<string, string> = { grammar: '文法', vocabulary: '用詞', politeness: '禮貌程度', fluency: '流暢度' };

export default function ReportScreen({ route, navigation }: StackProps<'Report'>) {
  const t = useTheme();
  const { report } = route.params;
  const scenario = scenarioById(route.params.scenarioId)!;
  const color = (n: number) => (n >= 80 ? t.success : n >= 60 ? t.primary : t.warning);

  return (
    <Screen edges={['bottom']}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <ProgressRing value={report.overall / 100} size={120} stroke={11} color={color(report.overall)}>
          <T style={{ fontSize: 34, fontWeight: '800' }}>{report.overall}</T>
          <T variant="caption" color={t.sub}>總分</T>
        </ProgressRing>
        <T variant="heading" style={{ marginTop: space.lg }}>{scenario.title}</T>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Pill icon={report.missionComplete ? 'checkmark-circle' : 'ellipse-outline'} label={report.missionComplete ? '任務完成' : '任務未完成'}
            color={report.missionComplete ? t.success : t.sub} bg={report.missionComplete ? t.successSoft : t.surface2} />
          <Pill icon="star" label="+30 XP" color={t.gold} bg={t.goldSoft} />
        </View>
        <T color={t.sub} style={{ marginTop: space.lg, textAlign: 'center', lineHeight: 22 }}>{report.summary}</T>
      </Card>

      <SectionTitle title="能力分析" />
      <Card style={{ gap: space.lg }}>
        {Object.entries(report.scores).map(([k, v]) => (
          <View key={k}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <T style={{ fontWeight: '600' }}>{labels[k] ?? k}</T>
              <T style={{ fontWeight: '800' }} color={color(v)}>{v}</T>
            </View>
            <ProgressBar value={v / 100} color={color(v)} height={8} />
          </View>
        ))}
      </Card>

      {report.strengths.length ? <>
        <SectionTitle title="做得好的地方" />
        <Card style={{ gap: space.md }}>
          {report.strengths.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
              <Ionicons name="thumbs-up-outline" size={18} color={t.success} />
              <T style={{ flex: 1, lineHeight: 22 }}>{s}</T>
            </View>
          ))}
        </Card>
      </> : null}

      {report.improvements.length ? <>
        <SectionTitle title="可以更好" />
        <Card>
          {report.improvements.map((m, i) => (
            <View key={i}>
              {i > 0 ? <View style={{ marginVertical: space.md }}><Divider /></View> : null}
              <T variant="small" color={t.sub}>{m.issue}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <T style={{ fontWeight: '800', flex: 1, fontSize: 16 }}>{m.better}</T>
                <SaveButton ja={m.better} zh={m.explanation} source={`分析：${scenario.title}`} compact />
              </View>
              <T variant="small" color={t.sub} style={{ marginTop: 4, lineHeight: 19 }}>{m.explanation}</T>
            </View>
          ))}
        </Card>
      </> : null}

      {report.keyPhrases.length ? <>
        <SectionTitle title="這場會話要記的句子" />
        <Card style={{ paddingVertical: space.xs }}>
          {report.keyPhrases.map((p, i) => (
            <View key={i}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{p.ja}</T>
                  <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{p.zh}</T>
                </View>
                <SaveButton ja={p.ja} zh={p.zh} source={`分析：${scenario.title}`} compact />
              </View>
            </View>
          ))}
        </Card>
      </> : null}

      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Button label="再練一次" icon="refresh" variant="secondary" onPress={() => navigation.replace('Chat', { scenarioId: scenario.id, lessonId: route.params.lessonId })} />
        <Button label="完成" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}
