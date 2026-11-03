import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Screen, T, Segmented } from '../ui';
import { useTheme, space, radius, fonts } from '../theme';
import { kanaRows } from '../content/kana';
import { speakJa } from '../lib/speech';

export default function KanaChartScreen() {
  const t = useTheme();
  const [script, setScript] = useState<'0' | '1'>('0');
  const idx = Number(script) as 0 | 1;

  return (
    <Screen edges={['bottom']}>
      <Segmented value={script} onChange={setScript} options={[{ value: '0', label: '平假名' }, { value: '1', label: '片假名' }]} />
      <T variant="caption" color={t.faint} style={{ marginTop: space.md, textAlign: 'center' }}>點一下聽發音</T>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {kanaRows.map(r => (
          <View key={r.row} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <T variant="caption" color={t.sub} style={{ width: 34 }}>{r.row}</T>
            {r.kana.map(k => (
              <Pressable key={k[2]} accessibilityRole="button" accessibilityLabel={`${k[idx]} ${k[2]}`} onPress={() => speakJa(k[idx])}
                style={({ pressed }) => ({ flex: 1, aspectRatio: 0.9, maxWidth: 64, backgroundColor: pressed ? t.primarySoft : t.surface,
                  borderWidth: 1, borderColor: t.line, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' })}>
                <T style={{ fontSize: 24, fontFamily: fonts.serifMedium }} color={t.heading}>{k[idx]}</T>
                <T variant="caption" color={t.faint}>{k[2].split(' ')[0]}</T>
              </Pressable>
            ))}
            {Array.from({ length: 5 - r.kana.length }).map((_, i) => <View key={i} style={{ flex: 1, maxWidth: 64 }} />)}
          </View>
        ))}
      </View>
    </Screen>
  );
}
