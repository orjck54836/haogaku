import { useLayoutEffect, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T, Button, Card, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { GoldRule } from '../ui/brand';
import { photoFor } from '../ui/images';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { useLesson } from '../lib/useLesson';
import { speakJa } from '../lib/speech';
import { ChoiceStep, LearnStep } from '../content/types';
import { StackProps } from '../navigation';

/** 單元內容總覽：一次看到這堂課所有的單字、句子和練習題 */
export default function LessonContentScreen({ route, navigation }: StackProps<'LessonContent'>) {
  const t = useTheme();
  const d = useData();
  const { ref, lesson, error, reload } = useLesson(route.params.lessonId);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: ref.lesson.title }); }, []);

  /** 開始上課；如果是從上課畫面進來的，就回到原本那個畫面 */
  function goStep(step: number) {
    const routes = navigation.getState().routes;
    const prev = routes[routes.length - 2];
    const params = { lessonId: ref.lesson.id, step, at: Date.now() };
    if (prev?.name === 'Lesson' && (prev.params as any)?.lessonId === ref.lesson.id) navigation.popTo('Lesson', params);
    else navigation.navigate('Lesson', params);
  }

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }} edges={['bottom']}>
        {error ? <>
          <Ionicons name="cloud-offline-outline" size={44} color={t.faint} />
          <T color={t.sub} style={{ textAlign: 'center' }}>{error}</T>
          <Button label="再試一次" onPress={reload} />
        </> : <>
          <ActivityIndicator color={t.primary} size="large" />
          <T color={t.sub}>正在準備內容…</T>
        </>}
      </SafeAreaView>
    );
  }

  const items = lesson.steps.map((s, i) => ({ s, i }));
  const learns = items.filter((x): x is { s: LearnStep; i: number } => x.s.type === 'learn');
  const quizzes = items.filter((x): x is { s: ChoiceStep; i: number } => x.s.type === 'choice');
  const done = d.progress.completed.includes(lesson.id);
  const resumeStep = d.progress.resume?.lessonId === lesson.id ? d.progress.resume.step : 0;
  const kana = lesson.kind === 'kana';
  const banner = photoFor(ref.topic?.id ?? 'basics', ref.topic?.cat);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxl * 2 }}>
        {/* 單元資訊：有主題照片就鋪成橫幅，沒有（五十音以外都有）就退回淺色磚 */}
        <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
          {banner ? (
            <View style={{ height: 150, justifyContent: 'flex-end' }}>
              <Image source={banner} resizeMode="cover"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
              <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,16,18,0.5)' }} />
              <View style={{ padding: space.lg }}>
                <T variant="caption" color={t.gold}>{ref.group}</T>
                <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>{lesson.title}</T>
              </View>
            </View>
          ) : (
            <View style={{ backgroundColor: t.surface2, padding: space.lg }}>
              <T variant="caption" color={t.primary}>{ref.group}</T>
              <T variant="title" style={{ marginTop: 2 }}>{lesson.title}</T>
              <GoldRule width={28} style={{ marginTop: space.sm }} />
            </View>
          )}
        </View>
        <T variant="small" color={t.sub} style={{ marginTop: space.md, lineHeight: 20 }}>{lesson.subtitle}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          <Pill icon="book-outline" label={`${learns.length} 個重點`} color={t.primary} bg={t.primarySoft} />
          <Pill icon="help-circle-outline" label={`${quizzes.length} 題練習`} color={t.primary} bg={t.primarySoft} />
          {done ? <Pill icon="checkmark-circle" label="已完成" color={t.success} bg={t.successSoft} /> : null}
        </View>

        {/* 教學內容 */}
        {learns.length ? (
          <View style={{ marginTop: space.xl }}>
            <Heading ja="まなぶ" title="這一課學的內容" />
            <View style={{ gap: space.sm }}>
              {learns.map(({ s, i }, n) => (
                <Card key={i} style={{ padding: space.md }}>
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    <Text style={{ width: 22, fontFamily: fonts.serif, fontSize: 14, color: t.gold, marginTop: 3 }}>{n + 1}</Text>
                    <Pressable style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`播放 ${s.ja}`} onPress={() => speakJa(s.ja)}>
                      <Text style={{ fontFamily: fonts.serifMedium, fontSize: kana && s.ja.length <= 2 ? 30 : 18, lineHeight: kana && s.ja.length <= 2 ? 40 : 27, color: t.heading }}>{s.ja}</Text>
                      {s.reading ? <T variant="caption" color={t.sub} style={{ marginTop: 2 }}>{s.reading}</T> : null}
                      <T style={{ fontWeight: '700', marginTop: 4 }}>{s.zh}</T>
                      {s.note ? <T variant="small" color={t.sub} style={{ marginTop: 4, lineHeight: 20 }}>{s.note}</T> : null}
                    </Pressable>
                    <View style={{ alignItems: 'center', gap: space.md }}>
                      <Pressable accessibilityRole="button" accessibilityLabel="播放" onPress={() => speakJa(s.ja)} hitSlop={8}>
                        <Ionicons name="volume-high-outline" size={20} color={t.primary} />
                      </Pressable>
                      {kana && s.ja.length <= 2 ? null : <SaveButton ja={s.ja} zh={s.zh} source={lesson.title} compact />}
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => goStep(i)} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: space.sm }}>
                    <T variant="caption" color={t.faint}>從這裡開始練習 ›</T>
                  </Pressable>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {/* 練習題 */}
        {quizzes.length ? (
          <View style={{ marginTop: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Heading ja="れんしゅう" title="練習題" />
              <Pressable accessibilityRole="button" onPress={() => { setShowAll(!showAll); setOpen({}); }} hitSlop={8} style={{ marginBottom: space.md }}>
                <T variant="small" color={t.primary} style={{ fontWeight: '700' }}>{showAll ? '全部收起' : '全部看答案'}</T>
              </Pressable>
            </View>
            <View style={{ gap: space.sm }}>
              {quizzes.map(({ s, i }, n) => {
                const shown = showAll ? open[i] !== false : !!open[i];
                const ans = s.options[s.answer];
                return (
                  <Card key={i} style={{ padding: space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <T variant="caption" color={t.gold}>第 {n + 1} 題 · {s.label}</T>
                      {s.speak ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="播放" onPress={() => speakJa(s.speak!)} hitSlop={8}>
                          <Ionicons name="volume-high-outline" size={18} color={t.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={{ fontFamily: fonts.serifMedium, fontSize: 17, lineHeight: 26, color: t.heading, marginTop: 6 }}>{s.line}</Text>
                    <T variant="small" style={{ marginTop: 4, fontWeight: '600' }}>{s.question}</T>
                    {shown ? (
                      <View style={{ marginTop: space.sm, backgroundColor: t.successSoft, borderRadius: radius.lg, padding: space.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={16} color={t.success} />
                          <Text style={{ flex: 1, fontFamily: fonts.serifMedium, fontSize: 16, color: t.ink }}>{ans.text}</Text>
                          {ans.sub ? <SaveButton ja={ans.text} zh={ans.sub} source={lesson.title} compact /> : null}
                        </View>
                        {ans.sub ? <T variant="small" color={t.sub} style={{ marginTop: 2, marginLeft: 22 }}>{ans.sub}</T> : null}
                        {s.lineZh ? <T variant="caption" color={t.sub} style={{ marginTop: 6 }}>題目意思：{s.lineZh}</T> : null}
                        <T variant="small" color={t.success} style={{ marginTop: 6, lineHeight: 20 }}>{s.explain}</T>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                      <Pressable accessibilityRole="button" onPress={() => setOpen(o => ({ ...o, [i]: !shown }))} hitSlop={6}>
                        <T variant="caption" color={t.primary} style={{ fontWeight: '700' }}>{shown ? '收起答案' : '看答案'}</T>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => goStep(i)} hitSlop={6}>
                        <T variant="caption" color={t.faint}>作答這一題 ›</T>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ padding: space.xl, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface }}>
        <Button label={resumeStep > 0 ? `繼續上課（第 ${resumeStep + 1} 張）` : done ? '再上一次' : '開始上課'} icon="play" onPress={() => goStep(resumeStep)} />
      </View>
    </SafeAreaView>
  );
}

function Heading({ ja, title }: { ja: string; title: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      <T variant="caption" color={t.gold} style={{ letterSpacing: 2 }}>{ja}</T>
      <T variant="heading" style={{ marginTop: 2 }}>{title}</T>
    </View>
  );
}
