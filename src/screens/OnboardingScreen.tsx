import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Button, ProgressBar, IconName } from '../ui';
import { useTheme, space, radius } from '../theme';
import { useData, Goal } from '../state/data';
import { LevelId } from '../content/types';

type Opt<V> = { value: V; title: string; sub: string; icon: IconName };

const goals: Opt<Goal>[] = [
  { value: 'travel', title: '去日本旅行', sub: '點餐、交通、購物都能自己來', icon: 'airplane-outline' },
  { value: 'study', title: '留學或打工度假', sub: '在日本生活所需的日語', icon: 'school-outline' },
  { value: 'work', title: '日商工作', sub: '面試、敬語與職場溝通', icon: 'briefcase-outline' },
  { value: 'hobby', title: '興趣', sub: '看動漫日劇、交日本朋友', icon: 'heart-outline' },
];
const levelOpts: Opt<LevelId>[] = [
  { value: 'L1', title: '完全沒學過', sub: '從五十音開始', icon: 'leaf-outline' },
  { value: 'L2', title: '會五十音', sub: '從旅行會話開始', icon: 'walk-outline' },
  { value: 'L3', title: '能簡單對話', sub: '從生活會話開始（N3〜N2）', icon: 'chatbubbles-outline' },
  { value: 'L4', title: '中高級', sub: '直接挑戰職場日語（N2〜N1）', icon: 'trophy-outline' },
];
const paces: Opt<number>[] = [
  { value: 30, title: '輕鬆', sub: '每天約 5 分鐘', icon: 'cafe-outline' },
  { value: 50, title: '標準', sub: '每天約 10 分鐘', icon: 'time-outline' },
  { value: 80, title: '認真', sub: '每天約 15 分鐘', icon: 'flame-outline' },
];

function Choice<V>({ opts, value, onChange }: { opts: Opt<V>[]; value: V; onChange: (v: V) => void }) {
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
  const t = useTheme();
  const { setProfile } = useData();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('travel');
  const [level, setLevel] = useState<LevelId>('L1');
  const [pace, setPace] = useState(50);

  const titles = ['你學日語是為了？', '你目前的程度？', '每天想練多久？'];

  return (
    <Screen edges={['top', 'bottom']}>
      <ProgressBar value={(step + 1) / 3} />
      <T variant="caption" color={t.sub} style={{ marginTop: space.lg }}>{step + 1} / 3</T>
      <T variant="title" style={{ marginTop: space.xs, marginBottom: space.xl }}>{titles[step]}</T>
      {step === 0 && <Choice opts={goals} value={goal} onChange={setGoal} />}
      {step === 1 && <Choice opts={levelOpts} value={level} onChange={setLevel} />}
      {step === 2 && <Choice opts={paces} value={pace} onChange={setPace} />}
      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Button label={step < 2 ? '下一步' : '開始學習'} onPress={() => {
          if (step < 2) setStep(step + 1);
          else setProfile({ onboarded: true, goal, startLevel: level, dailyGoal: pace });
        }} />
        {step > 0 ? <Button label="上一步" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
      </View>
    </Screen>
  );
}
