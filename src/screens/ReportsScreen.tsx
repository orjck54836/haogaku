import { View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Pill, SectionTitle, Divider, IconBox } from '../ui';
import { TopicThumb } from '../ui/seal';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { scenarioById } from '../content/scenarios';
import { planById } from '../content/plans';
import { retentionOf, RETENTION } from '../lib/reports';
import { whenLabel } from '../lib/date';
import { StackProps } from '../navigation';

/**
 * 會話分析的歷史。
 *
 * 只列「哪一場、什麼時候、幾分」——分數的細節在 ReportScreen，
 * 列表再把強弱項塞進來，掃的時候反而找不到自己要的那一場。
 *
 * 留幾份是方案差異（lib/reports.ts 的 RETENTION），所以頁尾要寫清楚
 * 目前留幾份，不然免費使用者只會覺得紀錄「自己不見了」。
 */
export default function ReportsScreen({ navigation }: StackProps<'Reports'>) {
  const t = useTheme();
  const d = useData();
  const plan = planById(d.profile.plan);
  const keep = retentionOf(d.profile.plan);
  // 主題被移除的舊紀錄接不回情境資料，列出來點了也只會壞掉
  const list = d.reports.filter(r => scenarioById(r.scenarioId));
  // 額度滿了才提示升級：還有空位時講「會被擠掉」是在嚇人，
  // 而且那時使用者根本還沒感覺到限制，說了也沒有意義
  const full = d.reports.length >= keep && d.profile.plan !== 'pro';
  const color = (n: number) => (n >= 80 ? t.success : n >= 60 ? t.primary : t.warning);

  function remove(id: string, title: string) {
    Alert.alert('刪除這份分析', `「${title}」的分析紀錄會從所有裝置移除。`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => d.removeReport(id) },
    ]);
  }

  if (!list.length) {
    return (
      <Screen edges={['bottom']}>
        <Card style={{ alignItems: 'center', paddingVertical: space.section, gap: space.md }}>
          <Ionicons name="document-text-outline" size={40} color={t.faint} />
          <T variant="heading">還沒有分析紀錄</T>
          <T color={t.sub} style={{ textAlign: 'center', lineHeight: 22 }}>
            {'練完一場 AI 會話並看完分析後，就會留在這裡。'}
          </T>
          <T variant="small" color={t.faint} style={{ textAlign: 'center' }}>
            {`${plan.name}方案保留最近 ${keep} 份`}
          </T>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <SectionTitle title="會話分析" ja="かいわぶんせき"
        right={<T variant="small" color={t.faint}>{list.length} 份</T>} />

      <Card style={{ paddingVertical: space.xs }}>
        {list.map((r, i) => {
          const s = scenarioById(r.scenarioId)!;
          return (
            <View key={r.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`${s.title} 的分析`}
                onPress={() => navigation.navigate('Report', {
                  report: r.report, scenarioId: r.scenarioId, lessonId: r.lessonId, savedAt: r.at,
                })}
                onLongPress={() => remove(r.id, s.title)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: space.md,
                  paddingVertical: space.md, opacity: pressed ? 0.65 : 1,
                })}>
                <TopicThumb topicId={s.id.replace(/^t-/, '')} title={s.title} size={46} />
                <View style={{ flex: 1 }}>
                  <T variant="heading" numberOfLines={1}>{s.title}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 }}>
                    <T variant="small" color={t.sub}>{whenLabel(r.at)}</T>
                    {r.report.missionComplete
                      ? <T variant="small" color={t.success}>任務完成</T>
                      : null}
                  </View>
                </View>
                <T style={{ fontWeight: '800', fontSize: 20 }} color={color(r.report.overall)}>{r.report.overall}</T>
                <Ionicons name="chevron-forward" size={18} color={t.faint} />
              </Pressable>
            </View>
          );
        })}
      </Card>

      {full ? (
        /* 擠掉舊紀錄是靜悄悄發生的，不講的話使用者只會覺得紀錄自己不見了。
           講清楚「下一份會取代最舊的那份」比單純推銷方案誠實，也才解釋得了為什麼要升級 */
        <Card onPress={() => navigation.navigate('Plans')} accessibilityLabel="查看方案"
          style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconBox name="archive-outline" color={t.gold} bg={t.goldSoft} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>{`已經存滿 ${keep} 份`}</T>
            <T variant="caption" color={t.sub} style={{ marginTop: 2, lineHeight: 18 }}>
              {`下一份分析會取代最舊的那份。升級方案可以保留最多 ${RETENTION.pro} 份。`}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.faint} />
        </Card>
      ) : null}

      {/* 存滿時上面那張卡已經講了份數，這裡再印一次就是同一個數字講兩遍 */}
      <View style={{ marginTop: space.lg, alignItems: 'center', gap: space.xs }}>
        {full ? null : <Pill icon="archive-outline" label={`${plan.name}方案保留最近 ${keep} 份`} color={t.sub} bg={t.surface2} />}
        <T variant="small" color={t.faint}>長按一筆可以刪除</T>
      </View>
    </Screen>
  );
}
