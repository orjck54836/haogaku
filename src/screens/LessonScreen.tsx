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
import StarReview from '../ui/StarReview';
import LessonPath from '../ui/LessonPath';
import { askReminderAfterLesson } from '../lib/reminders';
import { Seal } from '../ui/seal';
import FollowInvite from '../ui/FollowInvite';
import BindCard from '../ui/BindCard';
import { shareToThreads } from '../lib/share';
import { useAuth } from '../state/auth';
import { isReadingLesson } from '../content/readings';

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
  /**
   * 每一題的作答狀態分開存。
   * 原因：可以回到上一題，而回去時必須看得到當時答對／答錯的樣子；
   * 若只用單一組 wrong/solved，一往回走就被清空，看起來像沒作答過。
   */
  const [answers, setAnswers] = useState<Record<number, { wrong: number[]; solved: boolean; hint: string }>>({});
  const cur = answers[step];
  const wrong = cur?.wrong ?? [];
  const solved = cur?.solved ?? false;
  const hint = cur?.hint ?? '';
  const [finished, setFinished] = useState(false);
  const earned = useRef(0);
  /** 已經給過 XP 的題號，回到上一題重答時不再加分 */
  const scored = useRef<Set<number>>(new Set());
  /** 進這一課時的總 XP。完成後拿它跟現在的比，才知道這一課有沒有升段 */
  const xpAtStart = useRef(d.progress.xp);
  // 難度加權：道地說法、情境練習和進階主題的 XP 比基本說法高
  const xp = lessonXp(lesson, ref.topic);
  const s = lesson.steps[step];

  const { isGuest } = useAuth();

  /**
   * 通知權限在這裡問，不在冷啟動問（理由見 lib/reminders.ts 的 `ensureScheduled`）。
   * 晚 1.2 秒才跳：先讓他看到 +XP，Alert 一進場就蓋住慶祝的話，問句聽起來像在討東西。
   *
   * 升段**不讓位**：第一堂課就給 150 XP 以上，新手的第一堂一定升到 Lv.2。
   * 升段讓位的話第一堂永遠問不到，而只上一堂就離開的人正是最需要提醒的人。
   */
  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(() => { askReminderAfterLesson(); }, 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => { d.setResume(lesson.id, step); }, [step]);
  // 已在上課時，從「單元內容」點別張回來：跳到那一張
  useEffect(() => {
    if (jump === undefined || route.params.at === undefined) return;
    setStep(Math.max(0, Math.min(jump, lesson.steps.length - 1)));
    setAnswers({}); setFinished(false);
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
      // 只有第一次答對才給 XP：可以回到上一題，不擋的話來回走就能重複刷分
      if (!scored.current.has(step)) {
        scored.current.add(step);
        const got = wrong.length ? xp.retry : xp.first;
        earned.current += got; d.addXp(got);
      }
      setAnswers(a => ({ ...a, [step]: { wrong, solved: true, hint: '' } }));
    } else {
      setAnswers(a => ({ ...a, [step]: { wrong: [...wrong, i], solved: false, hint: c.options[i].hint ?? '再想想看' } }));
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function next() {
    if (step + 1 < lesson.steps.length) {
      setStep(step + 1);
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
    /**
     * 訪客的綁定卡：第 1、3 堂，之後每 5 堂一次。
     * 第一堂就出現是刻意的——那是他第一次有 XP 可以失去，也是訪客流失最多的關口，
     * 等到第 3 堂才問，大部分人已經不在了。之後放寬是因為每次都掛會被當成背景。
     * 和 IG 邀請互斥，綁定優先：沒綁定的人重裝就歸零，追蹤 IG 可以晚點再說。
     *
     * 升段時**照樣出現**（評價和 IG 才讓位）。第一堂課一定升到 Lv.2（155 XP > 150），
     * 以前寫成升段就讓位，結果第一堂的綁定卡一次都沒出現過——最關鍵的那一次。
     */
    const lessonsDone = d.progress.completed.filter(id => !isReadingLesson(id)).length;
    // 評價（星星）不和綁定搶：星星是常駐的小卡，兩張可以同時在
    const askBind = isGuest
      && (lessonsDone === 1 || lessonsDone === 3 || lessonsDone % 5 === 0);
    const goNext = () => {
      if (!nextRef) return navigation.goBack();
      if (nextRef.lesson.kind === 'ai') navigation.replace('Chat', { scenarioId: nextRef.lesson.scenarioId!, lessonId: nextRef.lesson.id });
      else navigation.replace('Lesson', { lessonId: nextRef.lesson.id });
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {/* 中段捲動、按鈕釘在底部：單元進度＋升段＋兩張卡在 iPhone SE 上疊不下，
            但「下一堂」無論如何都要在第一眼看得到 */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.md }}>
          <View style={{ alignItems: 'center', marginBottom: space.sm }}>
            <T variant="display" style={{ fontSize: 30, lineHeight: 38, fontFamily: fonts.serifMedium, letterSpacing: -0.3 }}>お疲れさまでした！</T>
            <T color={t.sub} style={{ marginTop: space.xs }}>完成「{lesson.title}」</T>
            {/* 成績標籤統一酒紅底白字、圓角方形（使用者指定）：和其他畫面的狀態 Pill 區隔開，
                讀起來是一排「獎牌」而不是一排標記 */}
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Pill square icon="star" label={`+${earned.current} XP`} color={t.onPrimary} bg={t.primary} />
              <Pill square icon="flame" label={`連續 ${d.streak()} 天`} color={t.onPrimary} bg={t.primary} />
              {/* 難度加成只在真的有加成時出現，不然每堂課都掛一個就沒有訊息量 */}
              {weightLabel(xp.weight) ? <Pill square icon="trending-up" label={weightLabel(xp.weight)!} color={t.onPrimary} bg={t.primary} /> : null}
              {/* 分享做成 Pill 擺在成績旁邊，不另起一顆大按鈕：和成績放一起就是「炫耀這個」的意思 */}
              <Pressable accessibilityRole="button" accessibilityLabel="分享到 Threads" hitSlop={6}
                // 帶主題名：只寫「基本說法」的話，看到貼文的人不知道是哪一課
                onPress={() => shareToThreads(`今天在皓學日語完成了「${ref.topic ? `${ref.topic.title}・` : ''}${lesson.title}」，連續學日文第 ${d.streak()} 天🔥\n\n#日文 #日語學習`, 'share-lesson')}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Pill square icon="share-outline" label="分享" color={t.onPrimary} bg={t.primary} />
              </Pressable>
              {/* 升段又要綁定（新手第一堂一定是這樣）：升段縮成一顆 Pill，大卡讓給綁定卡 */}
              {leveledUp && askBind ? <Pill square icon="ribbon" label={`升到 Lv.${after.n} ${after.name}`} color={t.onPrimary} bg={t.primary} /> : null}
            </View>
          </View>

          {/* 取代原本那顆大打勾：打勾改在進度條上「蓋」在剛完成那格，看得到自己走到哪 */}
          <LessonPath current={ref} completed={d.progress.completed} />

          {leveledUp && !askBind ? (
            <View style={{ alignItems: 'center', backgroundColor: t.shell,
              borderRadius: radius.xl, paddingVertical: space.xl, paddingHorizontal: space.section, gap: space.sm }}>
              <Seal kanji={after.kanji} size={54} tone="gold" />
              <T variant="caption" color={t.gold} style={{ fontWeight: '700', letterSpacing: 1, marginTop: 4 }}>LEVEL UP</T>
              <T style={{ fontSize: 22, fontFamily: fonts.serif }} color="#FFFFFF">Lv.{after.n} {after.name}</T>
              <T variant="caption" color="rgba(255,255,255,0.72)">{after.desc}</T>
            </View>
          ) : null}

          {/* 綁定和 IG 互斥、綁定優先；升段那次 IG 讓位給慶祝。
              星星不讓位：還沒去商店評過的人每一堂都要看得到（理由見 StarReview 檔頭） */}
          {askBind ? <BindCard placement="done" /> : null}
          {!leveledUp && !askBind ? <FollowInvite placement="done" /> : null}
          <StarReview />
        </ScrollView>
        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.md }}>
          {nextRef ? <Button label={`下一堂：${nextRef.lesson.title}`} icon="arrow-forward" variant="accent" onPress={goNext} /> : null}
          <Button label={nextRef ? "先到這裡" : "完成"} variant={nextRef ? "ghost" : "primary"} style={{ marginTop: space.sm }} onPress={() => navigation.goBack()} />
        </View>
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.xl, paddingTop: space.sm }}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="回到上一題" onPress={prev}
            style={({ pressed }) => ({ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: t.surface2,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="arrow-back" size={24} color={t.sub} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button label={step + 1 < lesson.steps.length ? (s.type === 'learn' ? '記住了，下一個' : '下一題') : '完成這一課'}
            variant="primary" disabled={!canNext} onPress={next} />
        </View>
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
