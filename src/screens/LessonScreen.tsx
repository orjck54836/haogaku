import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Button, ProgressBar, Card, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { lessonRef, allLessons, isUnlocked } from '../content/curriculum';
import { ChoiceStep, LearnStep } from '../content/types';
import { speakJa, stopSpeech } from '../lib/speech';
import { StackProps } from '../navigation';

const XP_FIRST = 10, XP_RETRY = 5, XP_FINISH = 20;

export default function LessonScreen({ route, navigation }: StackProps<'Lesson'>) {
  const t = useTheme();
  const d = useData();
  const ref = lessonRef(route.params.lessonId)!;
  const { lesson } = ref;
  const startStep = d.progress.resume?.lessonId === lesson.id ? Math.min(d.progress.resume.step, lesson.steps.length - 1) : 0;

  const [step, setStep] = useState(startStep);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState('');
  const [finished, setFinished] = useState(false);
  const earned = useRef(0);
  const s = lesson.steps[step];

  useEffect(() => { d.setResume(lesson.id, step); }, [step]);
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
      const xp = wrong.length ? XP_RETRY : XP_FIRST;
      earned.current += xp; d.addXp(xp);
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
      earned.current += XP_FINISH; d.addXp(XP_FINISH);
      d.completeLesson(lesson.id);
      setFinished(true);
    }
  }

  const nextRef = allLessons[ref.index + 1];
  const canNext = s?.type === 'learn' || solved;

  if (finished) {
    const goNext = () => {
      if (!nextRef || !isUnlocked(nextRef.lesson.id, [...d.progress.completed, lesson.id], d.profile.startLevel)) return navigation.goBack();
      if (nextRef.lesson.kind === 'ai') navigation.replace('Chat', { scenarioId: nextRef.lesson.scenarioId!, lessonId: nextRef.lesson.id });
      else navigation.replace('Lesson', { lessonId: nextRef.lesson.id });
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: space.xl }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: t.successSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={52} color={t.success} />
          </View>
          <T variant="title" style={{ marginTop: space.xl }}>お疲れさまでした！</T>
          <T color={t.sub} style={{ marginTop: space.sm }}>完成「{lesson.title}」</T>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xl }}>
            <Pill icon="star" label={`+${earned.current} XP`} color={t.warning} bg={t.warningSoft} />
            <Pill icon="flame" label={`連續 ${d.streak()} 天`} color={t.accent} bg={t.accentSoft} />
          </View>
        </View>
        {nextRef ? <Button label={`下一課：${nextRef.lesson.title}`} icon="arrow-forward" variant="accent" onPress={goNext} /> : null}
        <Button label="回到課程" variant="ghost" style={{ marginTop: space.sm }} onPress={() => navigation.goBack()} />
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
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.sm }}>
        <T variant="caption" color={t.primary}>{ref.unit.title} · {lesson.title}</T>
        {s.type === 'learn' ? <LearnCard s={s} source={lesson.title} /> : (
          <View>
            <View style={{ backgroundColor: t.ink, borderRadius: radius.lg, padding: space.lg, marginTop: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T variant="caption" color={t.bg} style={{ opacity: 0.7 }}>{s.label}</T>
                {s.speak ? (
                  <View style={{ flexDirection: 'row', gap: space.lg }}>
                    <SaveButton ja={s.speak} zh={s.lineZh ?? (lesson.kind === 'kana' ? undefined : s.options[s.answer].text)} source={lesson.title} color={t.bg} compact />
                    <Pressable accessibilityRole="button" accessibilityLabel="再聽一次" onPress={() => speakJa(s.speak!)} hitSlop={10}>
                      <Ionicons name="volume-high" size={20} color={t.bg} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <T style={{ fontSize: lesson.kind === 'kana' && s.line.length <= 3 ? 56 : 20, lineHeight: lesson.kind === 'kana' && s.line.length <= 3 ? 68 : 30, marginTop: space.sm, fontWeight: '700', textAlign: lesson.kind === 'kana' ? 'center' : 'left' }} color={t.bg}>
                {s.line}
              </T>
              {solved && s.lineZh ? <T variant="small" color={t.bg} style={{ opacity: 0.75, marginTop: space.sm }}>{s.lineZh}</T> : null}
            </View>

            <T variant="heading" style={{ marginTop: space.xl, marginBottom: space.md }}>{s.question}</T>
            {s.options.map((o, i) => {
              const right = solved && i === s.answer;
              const bad = wrong.includes(i);
              return (
                <Pressable key={i} accessibilityRole="button" disabled={solved || bad} onPress={() => choose(i)}
                  style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: radius.md, padding: space.lg, marginBottom: space.sm,
                    borderColor: right ? t.success : bad ? t.danger : t.line, backgroundColor: right ? t.successSoft : bad ? t.dangerSoft : t.surface }}>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 17, fontWeight: '600' }}>{o.text}</T>
                    {o.sub ? <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{o.sub}</T> : null}
                  </View>
                  {right ? <Ionicons name="checkmark-circle" size={24} color={t.success} /> : null}
                  {bad ? <Ionicons name="close-circle" size={24} color={t.danger} /> : null}
                  {solved && o.sub ? <View style={{ marginLeft: space.md }}><SaveButton ja={o.text} zh={o.sub} source={lesson.title} compact /></View> : null}
                </Pressable>
              );
            })}
            {solved ? (
              <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: t.successSoft, borderRadius: radius.md, padding: space.md, marginTop: space.sm }}>
                <Ionicons name="bulb-outline" size={18} color={t.success} />
                <T variant="small" color={t.success} style={{ flex: 1, lineHeight: 20 }}>{s.explain}</T>
              </View>
            ) : hint ? (
              <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: t.dangerSoft, borderRadius: radius.md, padding: space.md, marginTop: space.sm }}>
                <Ionicons name="information-circle-outline" size={18} color={t.danger} />
                <T variant="small" color={t.danger} style={{ flex: 1 }}>{hint}</T>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: space.xl, paddingTop: space.sm }}>
        <Button label={step + 1 < lesson.steps.length ? (s.type === 'learn' ? '記住了，下一個' : '下一題') : '完成這一課'}
          variant="dark" disabled={!canNext} onPress={next} />
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
        <T style={{ fontSize: big ? 88 : 30, lineHeight: big ? 104 : 40, fontWeight: '700', textAlign: 'center' }}>{s.ja}</T>
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
