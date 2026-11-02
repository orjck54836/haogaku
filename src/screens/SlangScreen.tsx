import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Button, Pill } from '../ui';
import SaveButton from '../ui/SaveButton';
import { useTheme, space, radius } from '../theme';
import { slang, todaySlangIndex } from '../content/slang';
import { speakJa } from '../lib/speech';

export default function SlangScreen() {
  const t = useTheme();
  const [i, setI] = useState(todaySlangIndex());
  const w = slang[i];
  return (
    <Screen edges={['bottom']}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <Pill label={`${i + 1} / ${slang.length}`} color={t.sub} bg={t.surface2} />
        <Pressable accessibilityRole="button" accessibilityLabel={`播放 ${w.word}`} onPress={() => speakJa(w.word)} style={{ marginTop: space.lg }}>
          <T style={{ fontSize: 46, fontWeight: '800' }}>{w.word}</T>
        </Pressable>
        <T color={t.sub}>{w.reading}</T>
        <T variant="heading" style={{ marginTop: space.lg, textAlign: 'center' }}>{w.meaning}</T>
        <Pressable accessibilityRole="button" onPress={() => speakJa(w.example)}
          style={{ alignSelf: 'stretch', backgroundColor: t.surface2, borderRadius: radius.md, padding: space.lg, marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <T style={{ flex: 1, fontSize: 17, fontWeight: '600' }}>{w.example}</T>
            <Ionicons name="volume-high-outline" size={20} color={t.primary} />
          </View>
          <T variant="small" color={t.sub} style={{ marginTop: 4 }}>{w.exampleZh}</T>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.lg }}>
          <Pill icon="pricetag-outline" label={`適合：${w.when}`} color={t.accent} bg={t.accentSoft} />
          <SaveButton ja={w.word} zh={w.meaning} source="流行語" />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
        <Button label="上一個" variant="secondary" style={{ flex: 1 }} onPress={() => setI((i - 1 + slang.length) % slang.length)} />
        <Button label="下一個" style={{ flex: 1 }} onPress={() => setI((i + 1) % slang.length)} />
      </View>
    </Screen>
  );
}
