import { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';
import { Pressable } from '../ui/Tap';
import { useAuth } from '../state/auth';
import { Logo } from '../ui/brand';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Button, ProgressBar, IconName } from '../ui';
import { useTheme, space, radius } from '../theme';
import { useData, Goal } from '../state/data';
import { track, setScreen } from '../lib/analytics';
import { LevelId } from '../content/types';
import { requestFirstLesson } from '../lib/firstRun';
import { answerOnboardingReminder, reminderAskable, DEFAULT_HOUR } from '../lib/reminders';

type Opt<V> = { value: V; title: string; sub: string; icon: IconName };

const goals: Opt<Goal>[] = [
  { value: 'travel', title: '去日本旅行', sub: '點餐、交通、購物都能自己來', icon: 'airplane-outline' },
  { value: 'study', title: '留學或打工度假', sub: '在日本生活所需的日語', icon: 'school-outline' },
  { value: 'work', title: '日商工作', sub: '面試、敬語與職場溝通', icon: 'briefcase-outline' },
  { value: 'hobby', title: '興趣', sub: '看動漫日劇、交日本朋友', icon: 'heart-outline' },
];
const levelOpts: Opt<LevelId>[] = [
  { value: 'L2', title: '初級', sub: '沒學過或剛會五十音（N5〜N4）', icon: 'leaf-outline' },
  { value: 'L3', title: '進階', sub: '能簡單對話，想講得更自然（N3〜N2）', icon: 'chatbubbles-outline' },
];
const paces: Opt<number>[] = [
  { value: 30, title: '輕鬆', sub: '每天約 5 分鐘', icon: 'cafe-outline' },
  { value: 50, title: '標準', sub: '每天約 10 分鐘', icon: 'time-outline' },
  { value: 80, title: '認真', sub: '每天約 15 分鐘', icon: 'flame-outline' },
];
/** 提醒時間只給四個時段：開放 24 格的話這一步會變成「設定」，而這裡要的是一秒答完 */
const hours: Opt<number>[] = [
  { value: 8, title: '早上 8:00', sub: '通勤的路上', icon: 'sunny-outline' },
  { value: 12, title: '中午 12:00', sub: '午休的空檔', icon: 'restaurant-outline' },
  { value: DEFAULT_HOUR, title: `晚上 ${DEFAULT_HOUR}:00`, sub: '晚餐後坐下來的時候', icon: 'home-outline' },
  { value: 22, title: '睡前 22:00', sub: '睡前複習記得最牢', icon: 'moon-outline' },
];

function Choice<V>({ opts, value, onChange }: { opts: Opt<V>[]; value: V | null; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: space.md }}>
      {opts.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md,
              borderWidth: 2, borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primarySoft : t.surface }}>
            <Ionicons name={o.icon} size={24} color={on ? t.primary : t.sub} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{o.title}</T>
              <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{o.sub}</T>
            </View>
            {on ? <Ionicons name="checkmark-circle" size={22} color={t.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  // 同登入頁：在導覽外面，要自己標畫面
  useEffect(() => { setScreen('Onboarding'); }, []);
  const t = useTheme();
  const { setProfile } = useData();
  const a = useAuth();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(a.user?.displayName ?? '');
  /**
   * 學習目標不預設。原本預設勾「旅行」，結果 52 人裡 42 人是旅行——大多是直接按下一步過去的。
   * 這個欄位是要拿去跟廣告商談的數字（見 analytics.ts 的 userProps），預設值會讓它失真，
   * 所以一定要點一個才能繼續。程度和每日目標照舊有預設：那兩題選錯之後隨時能改，也不拿去分群
   */
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<LevelId>('L2');
  const [pace, setPace] = useState(50);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  /**
   * 提醒那一步只在問得了的時候出現（理由見 reminderAskable）。
   * 在 effect 裡問一次存起來，不放進 render 的判斷式：探原生模組丟錯的話整頁會白掉
   */
  const [askRemind, setAskRemind] = useState(false);
  useEffect(() => { reminderAskable().then(setAskRemind).catch(() => {}); }, []);
  const [busy, setBusy] = useState(false);

  const titles = ['怎麼稱呼你？', '你學日語是為了？', '你目前的程度？', '每天想練多久？',
    ...(askRemind ? ['要每天提醒你練嗎？'] : [])];
  const last = titles.length - 1;
  const remindStep = askRemind && step === 4;
  const canNext = step === 0 ? nickname.trim().length > 0 : step === 1 ? goal !== null : true;

  async function finish(remind: boolean | null) {
    if (busy) return;
    setBusy(true);
    // 先等系統視窗答完再離開這頁：先切走的話視窗會蓋在第一堂課上，他得先處理它才看得到課
    if (remind !== null) await answerOnboardingReminder(remind, hour).catch(() => {});
    // 這是整個漏斗的第一個關口：裝了 app 卻沒走完設定的人，後面全部看不到
    track('onboarding_complete', { goal: goal!, level, daily_goal: pace });
    requestFirstLesson();
    setProfile({ onboarded: true, nickname: nickname.trim(), goal: goal!, startLevel: level, dailyGoal: pace });
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ProgressBar value={(step + 1) / titles.length} />
      <T variant="caption" color={t.sub} style={{ marginTop: space.lg }}>{step + 1} / {titles.length}</T>
      <T variant="title" style={{ marginTop: space.xs, marginBottom: space.xl }}>{titles[step]}</T>
      {step === 0 && (
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <Logo size={88} />
          <TextInput value={nickname} onChangeText={setNickname} maxLength={20} placeholder="輸入你的暱稱" placeholderTextColor={t.faint}
            autoFocus returnKeyType="next" onSubmitEditing={() => canNext && setStep(1)} accessibilityLabel="暱稱"
            style={{ alignSelf: 'stretch', backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: radius.md,
              paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 18, color: t.ink, textAlign: 'center' }} />
          <T variant="caption" color={t.faint}>之後可以在「我的」頁面修改</T>
        </View>
      )}
      {step === 1 && <Choice opts={goals} value={goal} onChange={setGoal} />}
      {step === 2 && <Choice opts={levelOpts} value={level} onChange={setLevel} />}
      {step === 3 && <Choice opts={paces} value={pace} onChange={setPace} />}
      {remindStep && (
        <>
          <T variant="small" color={t.sub} style={{ marginTop: -space.md, marginBottom: space.lg }}>{'一天一則，那天練過就不會跳。'}</T>
          <Choice opts={hours} value={hour} onChange={setHour} />
        </>
      )}
      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Button label={step < last ? '下一步' : remindStep ? '好，每天提醒我' : '開始第一堂課'} disabled={!canNext || busy} onPress={() => {
          if (step < last) { track('onboarding_step', { step: step + 1 }); setStep(step + 1); }
          else void finish(remindStep ? true : null);
        }} />
        {remindStep ? <Button label="先不用" variant="ghost" disabled={busy} onPress={() => { void finish(false); }} /> : null}
        {step > 0 ? <Button label="上一步" variant="ghost" disabled={busy} onPress={() => setStep(step - 1)} /> : null}
      </View>
    </Screen>
  );
}
