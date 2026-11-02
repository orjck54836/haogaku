import { useState } from 'react';
import { View, TextInput, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Pill, Divider } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { aiCheck, CheckResult } from '../lib/ai';
import { speakJa } from '../lib/speech';

const examples = ['昨日、友達と一緒にラーメンを食べに行きました。', '私は台湾から来ます。', 'この服を試着してもいいですか？'];

export default function CheckScreen() {
  const t = useTheme();
  const d = useData();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check() {
    const v = text.trim();
    if (!v) return setError('先輸入一句日文');
    if (v.length > 200) return setError('請輸入 200 字以內');
    setBusy(true); setResult(null);
    try {
      const r = await aiCheck(v, d.profile.startLevel);
      d.setAiRemaining(r.remaining);
      setResult(r);
    } catch (e: any) {
      Alert.alert('檢查失敗', e.message);
    } finally { setBusy(false); }
  }

  return (
    <Screen edges={['bottom']}>
      <T color={t.sub} style={{ lineHeight: 22 }}>寫一句想說的日文，AI 會檢查文法、告訴你更自然的說法和語氣差異。</T>
      <TextInput value={text} onChangeText={v => { setText(v); setError(''); }} multiline maxLength={200}
        placeholder="例如：私は台湾から来ます。" placeholderTextColor={t.faint} accessibilityLabel="要檢查的日文句子"
        style={{ marginTop: space.lg, minHeight: 110, backgroundColor: t.surface, borderWidth: 1, borderColor: error ? t.danger : t.line,
          borderRadius: radius.md, padding: space.lg, fontSize: 17, color: t.ink, textAlignVertical: 'top' }} />
      {error ? <T variant="small" color={t.danger} style={{ marginTop: 6 }}>{error}</T> : null}
      <T variant="caption" color={t.faint} style={{ marginTop: space.md }}>試試看範例</T>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {examples.map(e => (
          <Pressable key={e} accessibilityRole="button" onPress={() => { setText(e); setError(''); }}
            style={{ backgroundColor: t.surface2, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 10 }}>
            <T variant="small" color={t.sub}>{e}</T>
          </Pressable>
        ))}
      </View>
      <Button label="AI 檢查" icon="sparkles" loading={busy} style={{ marginTop: space.md }} onPress={check} />

      {result ? (
        <Card style={{ marginTop: space.xl }}>
          <Pill icon={result.natural ? 'checkmark-circle' : 'construct-outline'} label={result.natural ? '很自然！' : '可以更好'}
            color={result.natural ? t.success : t.warning} bg={result.natural ? t.successSoft : t.warningSoft} />
          <T variant="caption" color={t.sub} style={{ marginTop: space.lg }}>建議的說法</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 4 }}>
            <T style={{ flex: 1, fontSize: 19, fontWeight: '800', lineHeight: 28 }}>{result.corrected}</T>
            <Ionicons name="volume-high-outline" size={22} color={t.primary} onPress={() => speakJa(result.corrected)} accessibilityLabel="播放" />
            <SaveButton ja={result.corrected} zh={result.explanation} source="句子健檢" compact />
          </View>
          <T color={t.sub} style={{ marginTop: space.md, lineHeight: 22 }}>{result.explanation}</T>
          <T variant="caption" color={t.faint} style={{ marginTop: space.sm }}>語氣：{result.politeness}</T>

          {result.alternatives.length ? <>
            <View style={{ marginVertical: space.lg }}><Divider /></View>
            <T variant="heading">其他說法</T>
            {result.alternatives.map((a, i) => (
              <View key={i} style={{ marginTop: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <T style={{ flex: 1, fontWeight: '700' }}>{a.ja}</T>
                  <SaveButton ja={a.ja} zh={a.zh} source="句子健檢" compact />
                </View>
                <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{a.zh} · {a.nuance}</T>
              </View>
            ))}
          </> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
