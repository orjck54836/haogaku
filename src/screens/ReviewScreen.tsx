import { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, ProgressBar } from '../ui';
import { useTheme, space } from '../theme';
import { useData } from '../state/data';
import { speakJa } from '../lib/speech';
import { StackProps } from '../navigation';

export default function ReviewScreen({ navigation }: StackProps<'Review'>) {
  const t = useTheme();
  const d = useData();
  const queue = useMemo(() => d.dueWords(), []);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const w = queue[i];

  function answer(k: boolean) {
    d.reviewWord(w.ja, k);
    d.addXp(k ? 3 : 1);
    if (k) setKnown(n => n + 1);
    setFlipped(false);
    setI(i + 1);
  }

  if (!w) {
    return (
      <Screen scroll={false} edges={['bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trophy-outline" size={56} color={t.warning} />
          <T variant="title" style={{ marginTop: space.lg }}>複習完成</T>
          <T color={t.sub} style={{ marginTop: space.sm }}>記得 {known} 個，共 {queue.length} 個</T>
        </View>
        <Button label="完成" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={['bottom']}>
      <ProgressBar value={i / queue.length} color={t.success} />
      <T variant="caption" color={t.sub} style={{ marginTop: 6 }}>{i + 1} / {queue.length}</T>

      <Pressable accessibilityRole="button" accessibilityLabel="翻面" onPress={() => { setFlipped(true); speakJa(w.ja); }} style={{ flex: 1, marginTop: space.lg }}>
        <Card style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 42 }}>{w.ja}</T>
          {flipped ? (
            <>
              <T variant="heading" color={t.sub} style={{ marginTop: space.lg, textAlign: 'center' }}>{w.zh ?? '（沒有翻譯）'}</T>
              <T variant="caption" color={t.faint} style={{ marginTop: space.md }}>來自：{w.source}</T>
            </>
          ) : <T variant="small" color={t.faint} style={{ marginTop: space.lg }}>點一下看意思</T>}
        </Card>
      </Pressable>

      {flipped ? (
        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
          <Button label="還不熟" variant="secondary" style={{ flex: 1 }} onPress={() => answer(false)} />
          <Button label="記得" variant="primary" style={{ flex: 1 }} onPress={() => answer(true)} />
        </View>
      ) : <Button label="看答案" variant="dark" style={{ marginTop: space.lg }} onPress={() => { setFlipped(true); speakJa(w.ja); }} />}
    </Screen>
  );
}
