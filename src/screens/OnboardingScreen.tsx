import { useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useAuth } from '../state/auth';
import { Logo } from '../ui/brand';
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
  { value: 'L2', title: '初級', sub: '沒學過或剛會五十音（N5〜N4）', icon: 'leaf-outline' },
  { value: 'L3', title: '進階', sub: '能簡單對話，想講得更自然（N3〜N2）', icon: 'chatbubbles-outline' },
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
  const a = useAuth();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(a.user?.displayName ?? '');
  const [goal, setGoal] = useState<Goal>('travel');
  const [level, setLevel] = useState<LevelId>('L2');
  const [pace, setPace] = useState(50);

  const titles = ['怎麼稱呼你？', '你學日語是為了？', '你目前的程度？', '每天想練多久？'];
  const last = titles.length - 1;
  const canNext = step !== 0 || nickname.trim().length > 0;

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
      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Button label={step < last ? '下一步' : '開始學習'} disabled={!canNext} onPress={() => {
          if (step < last) setStep(step + 1);
          else setProfile({ onboarded: true, nickname: nickname.trim(), goal, startLevel: level, dailyGoal: pace });
        }} />
        {step > 0 ? <Button label="上一步" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
      </View>
    </Screen>
  );
}
