import { ReactNode, useLayoutEffect, useState } from 'react';
import { View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { T, Button, Avatar, IconName } from '../ui';
import { GoldRule } from '../ui/brand';
import { useTheme, space, radius } from '../theme';
import { useAuth } from '../state/auth';
import { useData, Goal } from '../state/data';
import { LevelId } from '../content/types';
import { setSpeechRate, speakJa } from '../lib/speech';
import { pickAndUploadAvatar, removeAvatar, avatarPickerSupported } from '../lib/avatar';
import { StackProps } from '../navigation';

const goals: { value: Goal; label: string; icon: IconName }[] = [
  { value: 'travel', label: '去日本旅行', icon: 'airplane-outline' },
  { value: 'study', label: '留學／打工度假', icon: 'school-outline' },
  { value: 'work', label: '日商工作', icon: 'briefcase-outline' },
  { value: 'hobby', label: '興趣', icon: 'heart-outline' },
];
const levels: { value: LevelId; label: string }[] = [
  { value: 'L2', label: '初級' }, { value: 'L3', label: '進階' },
];
const paces = [{ value: 30, label: '輕鬆 30 XP' }, { value: 50, label: '標準 50 XP' }, { value: 80, label: '認真 80 XP' }];
const rates = [{ value: 0.85, label: '慢' }, { value: 1.0, label: '標準' }, { value: 1.15, label: '快' }];

export const NICKNAME_MAX = 20;

export default function EditProfileScreen({ navigation }: StackProps<'EditProfile'>) {
  const t = useTheme();
  const a = useAuth();
  const d = useData();
  const p = d.profile;

  const [nickname, setNickname] = useState(p.nickname || a.user?.displayName || '');
  const [jaName, setJaName] = useState(p.jaName);
  const [intro, setIntro] = useState(p.intro);
  const [goal, setGoal] = useState<Goal>(p.goal);
  const [level, setLevel] = useState<LevelId>(p.startLevel);
  const [pace, setPace] = useState(p.dailyGoal);
  const [rate, setRate] = useState(p.speechRate);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(p.photo);
  const [uploading, setUploading] = useState(false);

  /**
   * 換照片。
   *
   * 上傳成功就**立刻寫進 profile**，不等這一頁按「儲存」——
   * 照片已經傳到 Storage 了，這時候離開頁面卻看不到它，只會讓人以為上傳失敗。
   * 下面的 photo state 只是給這一頁預覽用。
   */
  async function changePhoto() {
    if (!avatarPickerSupported()) {
      return Alert.alert('這個版本還不能選照片', '相片選擇器需要重新安裝 App 的版本才會出現，其他功能都不受影響。');
    }
    setUploading(true);
    try {
      const r = await pickAndUploadAvatar();
      if (r.ok) { setPhoto(r.url); d.setProfile({ photo: r.url }); return; }
      // 自己按取消不要跳任何東西——按了取消還彈一個對話框是最煩的互動
      if (r.reason === 'cancelled') return;
      if (r.reason === 'denied') return Alert.alert('需要相簿權限', '請到「設定 → 皓學日語 → 照片」允許讀取，再試一次。');
      Alert.alert('上傳失敗', '請檢查網路後再試一次。');
    } finally {
      setUploading(false);
    }
  }

  function clearPhoto() {
    Alert.alert('移除大頭照？', '會改回用暱稱的第一個字顯示。', [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => {
        setPhoto(''); d.setProfile({ photo: '' }); removeAvatar();
      } },
    ]);
  }

  const dirty = nickname.trim() !== (p.nickname || a.user?.displayName || '') || jaName.trim() !== p.jaName || intro.trim() !== p.intro
    || goal !== p.goal || level !== p.startLevel || pace !== p.dailyGoal || rate !== p.speechRate;

  async function save() {
    const name = nickname.trim();
    if (!name) return Alert.alert('請填寫暱稱', '讓我們知道怎麼稱呼你');
    setSaving(true);
    try {
      d.setProfile({ nickname: name, jaName: jaName.trim(), intro: intro.trim(), goal, startLevel: level, dailyGoal: pace, speechRate: rate });
      setSpeechRate(rate);
      // 正式帳號同步到 Firebase 帳號名稱（訪客沒有也沒關係）
      if (a.user && !a.user.isAnonymous && a.user.displayName !== name) {
        await updateProfile(a.user, { displayName: name }).catch(() => {});
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable accessibilityRole="button" onPress={save} disabled={!dirty || saving} hitSlop={10}>
          <T variant="small" color={dirty ? t.primary : t.faint} style={{ fontWeight: '800' }}>儲存</T>
        </Pressable>
      ),
    });
  });

  const input = {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: t.ink,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
        <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
          <Section title="基本資料" ja="プロフィール">
            {/* 大頭照放在最前面：它是這一頁唯一「看得到自己」的東西，
                排在暱稱下面的話，一進來先看到的是一排輸入框 */}
            <View style={{ alignItems: 'center', marginBottom: space.xl, gap: space.md }}>
              <Pressable accessibilityRole="button" accessibilityLabel="更換大頭照"
                onPress={changePhoto} disabled={uploading}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <Avatar name={nickname} photo={photo} size={96} bg={t.gold} fg="#231A08" />
                {/* 相機圖示壓在右下角：圓形頭像本身看不出可以點 */}
                <View style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16,
                  backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 3, borderColor: t.bg }}>
                  {uploading
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Ionicons name="camera" size={15} color="#FFFFFF" />}
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: space.lg }}>
                <Pressable accessibilityRole="button" onPress={changePhoto} disabled={uploading} hitSlop={8}>
                  <T variant="small" color={t.primary} style={{ fontWeight: '700' }}>
                    {photo ? '更換照片' : '上傳照片'}
                  </T>
                </Pressable>
                {photo ? (
                  <Pressable accessibilityRole="button" onPress={clearPhoto} disabled={uploading} hitSlop={8}>
                    <T variant="small" color={t.sub}>移除</T>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Field label="暱稱" hint={`${nickname.length}/${NICKNAME_MAX}`}>
              <TextInput value={nickname} onChangeText={setNickname} maxLength={NICKNAME_MAX} placeholder="例如：小明"
                placeholderTextColor={t.faint} style={input} returnKeyType="next" accessibilityLabel="暱稱" />
            </Field>
            <Field label="日文稱呼（選填）" hint="例如：ミン、ケン">
              <TextInput value={jaName} onChangeText={setJaName} maxLength={20} placeholder="用片假名或平假名"
                placeholderTextColor={t.faint} style={input} accessibilityLabel="日文稱呼" />
            </Field>
            <Field label="一句話自我介紹（選填）" hint={`${intro.length}/60`}>
              <TextInput value={intro} onChangeText={setIntro} maxLength={60} placeholder="例如：明年想去東京打工度假！"
                placeholderTextColor={t.faint} style={[input, { minHeight: 72 }]} multiline accessibilityLabel="自我介紹" />
            </Field>
          </Section>

          <Section title="學習目標" ja="もくひょう">
            <Chips value={goal} onChange={setGoal} options={goals} />
          </Section>

          <Section title="日語程度" ja="レベル">
            <Chips value={level} onChange={setLevel} options={levels} />
            <T variant="caption" color={t.faint} style={{ marginTop: space.sm }}>會影響推薦主題與 AI 會話的難度</T>
          </Section>

          <Section title="每日目標" ja="まいにち">
            <Chips value={pace} onChange={setPace} options={paces} />
          </Section>

          <Section title="語音速度" ja="スピード">
            <Chips value={rate} onChange={v => {
              setRate(v); setSpeechRate(v);
              speakJa(v < 1 ? 'ゆっくり話します。' : v > 1 ? '少し速く話します。' : '普通の速さで話します。');
            }} options={rates} />
          </Section>

          <Button label="儲存" icon="checkmark" loading={saving} disabled={!dirty} onPress={save} style={{ marginTop: space.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, ja, children }: { title: string; ja: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space.xl }}>
      <T variant="caption" color={t.gold} style={{ letterSpacing: 2 }}>{ja}</T>
      <T variant="heading" style={{ marginTop: 2 }}>{title}</T>
      <GoldRule width={24} style={{ marginTop: 6, marginBottom: space.md }} />
      {children}
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <T variant="small" style={{ fontWeight: '700' }}>{label}</T>
        {hint ? <T variant="caption" color={t.faint}>{hint}</T> : null}
      </View>
      {children}
    </View>
  );
}

function Chips<V extends string | number>({ value, options, onChange }: {
  value: V; options: { value: V; label: string; icon?: IconName }[]; onChange: (v: V) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
              borderWidth: 1.5, borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primarySoft : t.surface }}>
            {o.icon ? <Ionicons name={o.icon} size={16} color={on ? t.primary : t.sub} /> : null}
            <T variant="small" color={on ? t.primary : t.ink} style={{ fontWeight: on ? '800' : '500' }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
