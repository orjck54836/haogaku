import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Button, ProgressBar, Card, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { lessonRef, allLessons } from '../content/curriculum';
import { ChoiceStep, LearnStep, Lesson } from '../content/types';
import { useLesson } from '../lib/useLesson';
import { ActivityIndicator } from 'react-native';
import { speakJa, stopSpeech } from '../lib/speech';
import { StackProps } from '../navigation';
import { lessonXp, rankOf, weightLabel } from '../lib/rank';
import { useReviewPrompt } from '../lib/useReviewPrompt';
import { Seal } from '../ui/seal';

/** 外層：AI 主題課先載入內容 */
export default function LessonScreen(props: StackProps<'Lesson'>) {
  const t = useTheme();
  const { ref, lesson, error, reload: load } = useLesson(props.route.params.lessonId);

  if (lesson) return <LessonPlayer {...props} lesson={lesson} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: space.xl }}>
      <Pressable accessibilityRole="button" accessibilityLabel="離開" onPress={() => props.navigation.goBack()} hitSlop={12}>
        <Ionicons name="close" size={26} color={t.sub} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        {error ? <>
          <Ionicons name="cloud-offline-outline" size={44} color={t.faint} />
          <T color={t.sub} style={{ textAlign: 'center' }}>{error}</T>
          <Button label="再試一次" onPress={load} />
        </> : <>
          <ActivityIndicator color={t.primary} size="large" />
          <T variant="heading">正在準備「{ref.topic?.title}・{ref.lesson.title}」</T>
          <T variant="small" color={t.sub} style={{ textAlign: 'center' }}>第一次開啟需要十幾秒，之後就能立即開始</T>
        </>}
      </View>
    </SafeAreaView>
  );
}

function LessonPlayer({ route, navigation, lesson }: StackProps<'Lesson'> & { lesson: Lesson }) {
  const t = useTheme();
  const d = useData();
  const ref = lessonRef(route.params.lessonId)!;
  // 從「單元內容」點某一張進來時，直接跳到那一張
  const jump = route.params.step;
  const startStep = jump !== undefined ? Math.max(0, Math.min(jump, lesson.steps.length - 1))
    : d.progress.resume?.lessonId === lesson.id ? Math.min(d.progress.resume.step, lesson.steps.length - 1) : 0;

  const [step, setStep] = useState(startStep);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState('');
  const [finished, setFinished] = useState(false);
  const earned = useRef(0);
  /** 進這一課時的總 XP。完成後拿它跟現在的比，才知道這一課有沒有升段 */
  const xpAtStart = useRef(d.progress.xp);
  // 難度加權：道地說法、情境練習和進階主題的 XP 比基本說法高
  const xp = lessonXp(lesson, ref.topic);
  const s = lesson.steps[step];

  // 上完一堂課是使用者心情最好的時刻，評價就在這時問（時機規則見 lib/review.ts）
  useReviewPrompt(finished);

  useEffect(() => { d.setResume(lesson.id, step); }, [step]);
  // 已在上課時，從「單元內容」點別張回來：跳到那一張
  useEffect(() => {
    if (jump === undefined || route.params.at === undefined) return;
    setStep(Math.max(0, Math.min(jump, lesson.steps.length - 1)));
    setWrong([]); setSolved(false); setHint(''); setFinished(false);
  }, [route.params.at]);
  useEffect(() => {
    if (finished) return;
    if (s.type === 'learn') speakJa(s.ja);
    else if (s.speak) speakJa(s.speak);
    return () => stopSpeech();
  }, [step, finished]);

  function choose(i: number) {
    const c = s as ChoiceStep;
    if (solved) return;
    if (i === c.answer) {
      const got = wrong.length ? xp.retry : xp.first;
      earned.current += got; d.addXp(got);
      setSolved(true); setHint('');
    } else {
      setWrong(w => [...w, i]);
      setHint(c.options[i].hint ?? '再想想看');
    }
  }

  function next() {
    if (step + 1 < lesson.steps.length) {
      setStep(step + 1); setWrong([]); setSolved(false); setHint('');
    } else {
      earned.current += xp.finish; d.addXp(xp.finish);
      d.completeLesson(lesson.id);
      setFinished(true);
    }
  }

  const after = allLessons[ref.index + 1];
  const nextRef = after && after.topic?.id === ref.topic?.id ? after : undefined;
  const canNext = s?.type === 'learn' || solved;

  if (finished) {
    // 升段：拿進來時的 XP 和現在的比。同一堂課裡可能跨段，所以不能只看最後一次加分
    const before = rankOf(xpAtStart.current);
    const after = rankOf(d.progress.xp);
    const leveledUp = after.n > before.n;
    const goNext = () => {
      if (!nextRef) return navigation.goBack();
      if (nextRef.lesson.kind === 'ai') navigation.replace('Chat', { scenarioId: nextRef.lesson.scenarioId!, lessonId: nextRef.lesson.id });
      else navigation.replace('Lesson', { lessonId: nextRef.lesson.id });
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: space.xl }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={52} color={t.primary} />
          </View>
          <T variant="display" style={{ marginTop: space.xl, fontSize: 30, lineHeight: 38 }}>お疲れさまでした！</T>
          <T color={t.sub} style={{ marginTop: space.sm }}>完成「{lesson.title}」</T>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xl, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Pill icon="star" label={`+${earned.current} XP`} color={t.gold} bg={t.goldSoft} />
            <Pill icon="flame" label={`連續 ${d.streak()} 天`} color={t.accent} bg={t.accentSoft} />
            {/* 難度加成只在真的有加成時出現，不然每堂課都掛一個就沒有訊息量 */}
            {weightLabel(xp.weight) ? <Pill icon="trending-up" label={weightLabel(xp.weight)!} color={t.success} bg={t.successSoft} /> : null}
          </View>

          {leveledUp ? (
            <View style={{ alignItems: 'center', marginTop: space.section, backgroundColor: t.shell,
              borderRadius: radius.xl, paddingVertical: space.xl, paddingHorizontal: space.section, gap: space.sm }}>
              <Seal kanji={after.kanji} size={54} tone="gold" />
              <T variant="caption" color={t.gold} style={{ fontWeight: '700', letterSpacing: 1, marginTop: 4 }}>LEVEL UP</T>
              <T style={{ fontSize: 22, fontFamily: fonts.serif }} color="#FFFFFF">Lv.{after.n} {after.name}</T>
              <T variant="caption" color="rgba(255,255,255,0.72)">{after.desc}</T>
            </View>
          ) : null}
        </View>
        {nextRef ? <Button label={`下一堂：${nextRef.lesson.title}`} icon="arrow-forward" variant="accent" onPress={goNext} /> : null}
        <Button label={nextRef ? "先到這裡" : "完成"} variant={nextRef ? "ghost" : "primary"} style={{ marginTop: space.sm }} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel="離開，進度會保存" onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={26} color={t.sub} />
        </Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={(step + (canNext ? 1 : 0)) / lesson.steps.length} color={t.success} height={8} /></View>
        <T variant="caption" color={t.sub}>{step + 1}/{lesson.steps.length}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="看這一課的全部內容" hitSlop={10}
          onPress={() => navigation.navigate('LessonContent', { lessonId: lesson.id })}>
          <Ionicons name="list" size={24} color={t.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.sm }}>
        <T variant="caption" color={t.primary}>{ref.group} · {lesson.title}</T>
        {s.type === 'learn' ? <LearnCard s={s} source={lesson.title} /> : (
          <View>
            <View style={{ backgroundColor: t.shell, borderRadius: radius.lg, padding: space.lg, marginTop: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T variant="caption" color="#FFFFFF" style={{ opacity: 0.75 }}>{s.label}</T>
                {s.speak ? (
                  <View style={{ flexDirection: 'row', gap: space.lg }}>
                    <SaveButton ja={s.speak} zh={s.lineZh ?? (lesson.kind === 'kana' ? undefined : s.options[s.answer].text)} source={lesson.title} color="#FFFFFF" compact />
                    <Pressable accessibilityRole="button" accessibilityLabel="再聽一次" onPress={() => speakJa(s.speak!)} hitSlop={10}>
                      <Ionicons name="volume-high" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <T style={{ fontSize: lesson.kind === 'kana' && s.line.length <= 3 ? 56 : 20, lineHeight: lesson.kind === 'kana' && s.line.length <= 3 ? 72 : 32, marginTop: space.sm, fontFamily: fonts.serifMedium, textAlign: lesson.kind === 'kana' ? 'center' : 'left' }} color="#FFFFFF">
                {s.line}
              </T>
              {solved && s.lineZh ? <T variant="small" color="#FFFFFF" style={{ opacity: 0.8, marginTop: space.sm }}>{s.lineZh}</T> : null}
            </View>

            <T variant="heading" style={{ marginTop: space.xl, marginBottom: space.md }}>{s.question}</T>
            {s.options.map((o, i) => {
              const right = solved && i === s.answer;
              const bad = wrong.includes(i);
              return (
                <Pressable key={i} accessibilityRole="button" disabled={solved || bad} onPress={() => choose(i)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm,
                    backgroundColor: right ? t.successSoft : bad ? t.dangerSoft : t.surface2,
                    opacity: pressed ? 0.7 : bad ? 0.55 : 1 })}>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 18, lineHeight: 26, fontFamily: fonts.serifMedium }} color={t.heading}>{o.text}</T>
                    {/* 中文意思等作答後才顯示：答對後全部顯示，答錯的選項當下顯示 */}
                    {o.sub && (solved || bad) ? <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{o.sub}</T> : null}
                  </View>
                  {right ? <Ionicons name="checkmark-circle" size={24} color={t.success} /> : null}
                  {bad ? <Ionicons name="close-circle" size={24} color={t.danger} /> : null}
                  {solved && o.sub ? <View style={{ marginLeft: space.md }}><SaveButton ja={o.text} zh={o.sub} source={lesson.title} compact /></View> : null}
                </Pressable>
              );
            })}
            {solved ? (
              <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: t.successSoft, borderRadius: radius.lg, padding: space.md, marginTop: space.sm }}>
                <Ionicons name="bulb-outline" size={18} color={t.success} />
                <T variant="small" color={t.success} style={{ flex: 1, lineHeight: 20 }}>{s.explain}</T>
              </View>
            ) : hint ? (
              <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: t.dangerSoft, borderRadius: radius.lg, padding: space.md, marginTop: space.sm }}>
                <Ionicons name="information-circle-outline" size={18} color={t.danger} />
                <T variant="small" color={t.danger} style={{ flex: 1 }}>{hint}</T>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: space.xl, paddingTop: space.sm }}>
        <Button label={step + 1 < lesson.steps.length ? (s.type === 'learn' ? '記住了，下一個' : '下一題') : '完成這一課'}
          variant="primary" disabled={!canNext} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

function LearnCard({ s, source }: { s: LearnStep; source: string }) {
  const t = useTheme();
  const big = s.ja.length <= 2;
  return (
    <Card style={{ marginTop: space.md, alignItems: 'center', paddingVertical: space.xxl }}>
      <Pill label="新內容" color={t.primary} bg={t.primarySoft} />
      <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${s.ja}`} onPress={() => speakJa(s.ja)} style={{ marginTop: space.lg }}>
        <T style={{ fontSize: big ? 88 : 30, lineHeight: big ? 112 : 44, fontFamily: fonts.serifMedium, textAlign: 'center' }} color={t.heading}>{s.ja}</T>
      </Pressable>
      {s.reading ? <T style={{ fontSize: big ? 22 : 15, marginTop: space.xs }} color={t.sub}>{s.reading}</T> : null}
      <T variant="heading" style={{ marginTop: space.lg }}>{s.zh}</T>
      {s.note ? <T variant="small" color={t.sub} style={{ marginTop: space.sm, textAlign: 'center' }}>{s.note}</T> : null}
      <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.xl }}>
        <Pressable accessibilityRole="button" onPress={() => speakJa(s.ja)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={8}>
          <Ionicons name="volume-high-outline" size={18} color={t.primary} />
          <T variant="small" color={t.primary} style={{ fontWeight: '600' }}>再聽一次</T>
        </Pressable>
        {big ? null : <SaveButton ja={s.ja} zh={s.zh} source={source} />}
      </View>
    </Card>
  );
}
