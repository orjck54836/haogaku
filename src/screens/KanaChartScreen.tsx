import { useState } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Screen, T, Segmented, Button, RoundButton } from '../ui';
import { StrokePlayer, WritingPad } from '../ui/strokes';
import { useTheme, space, radius, fonts } from '../theme';
import { kanaRows } from '../content/kana';
import { kanaStrokes } from '../content/kanaStrokes';
import { speakJa } from '../lib/speech';

/** 筆順 + 手寫的詳細頁。目前只有あ行有筆畫資料，其餘的格子仍然是點了就唸 */
function KanaDetail({ kana, roma, onClose }: { kana: string; roma: string; onClose: () => void }) {
  const t = useTheme();
  const [mode, setMode] = useState<'play' | 'write'>('play');
  const data = kanaStrokes[kana];

  // 不用 pageSheet：它的下滑關閉是 UIKit 的手勢，RN 的 responder 攔不住，
  // 在手寫板上往下寫一筆就會把整個面板拉掉。Screen 的 scroll 也關掉，手勢只留給手寫板
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {/* Modal 是另一棵 view 樹，不自己供 provider 的話 inset 全是 0，標題會頂到瀏海 */}
      <SafeAreaProvider>
      <Screen scroll={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ flex: 1 }}>
            <T variant="display" style={{ fontFamily: fonts.serif }}>{kana}</T>
            <T variant="caption" color={t.faint}>{roma}</T>
          </View>
          <RoundButton icon="volume-high" onPress={() => speakJa(kana)} bg={t.primary} fg={t.onPrimary} accessibilityLabel="聽發音" />
          <RoundButton icon="close" onPress={onClose} bg={t.surface2} fg={t.ink} accessibilityLabel="關閉" />
        </View>

        <View style={{ marginTop: space.xl }}>
          <Segmented value={mode} onChange={setMode}
            options={[{ value: 'play' as const, label: '看筆順' }, { value: 'write' as const, label: '自己寫' }]} />
        </View>

        <View style={{ alignItems: 'center', marginTop: space.xxl }}>
          {mode === 'play'
            ? <StrokePlayer char={kana} data={data} size={240} />
            : <WritingPad char={kana} data={data} size={260} />}
        </View>

        <View style={{ marginTop: space.section }}>
          <Button label="完成" onPress={onClose} variant="secondary" />
        </View>
      </Screen>
      </SafeAreaProvider>
    </Modal>
  );
}

export default function KanaChartScreen() {
  const t = useTheme();
  const [script, setScript] = useState<'0' | '1'>('0');
  const [open, setOpen] = useState<{ kana: string; roma: string } | null>(null);
  const idx = Number(script) as 0 | 1;

  return (
    <Screen edges={['bottom']}>
      <Segmented value={script} onChange={setScript} options={[{ value: '0', label: '平假名' }, { value: '1', label: '片假名' }]} />
      <T variant="caption" color={t.faint} style={{ marginTop: space.md, textAlign: 'center' }}>
        點一下看筆順、練手寫
      </T>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {kanaRows.map(r => (
          <View key={r.row} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <T variant="caption" color={t.sub} style={{ width: 34 }}>{r.row}</T>
            {r.kana.map(k => {
              const char = k[idx];
              // 92 個字都有筆畫資料了，沒有的話仍然退回「點了就唸」
              const drawable = char in kanaStrokes;
              return (
                <Pressable key={k[2]} accessibilityRole="button"
                  accessibilityLabel={`${char} ${k[2]}${drawable ? '，看筆順' : ''}`}
                  onPress={() => (drawable ? setOpen({ kana: char, roma: k[2] }) : speakJa(char))}
                  style={({ pressed }) => ({ flex: 1, aspectRatio: 0.9, maxWidth: 64, backgroundColor: pressed ? t.primarySoft : t.surface,
                    borderWidth: 1, borderColor: t.line, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' })}>
                  <T style={{ fontSize: 24, fontFamily: fonts.serifMedium }} color={t.heading}>{char}</T>
                  <T variant="caption" color={t.faint}>{k[2].split(' ')[0]}</T>
                </Pressable>
              );
            })}
            {Array.from({ length: 5 - r.kana.length }).map((_, i) => <View key={i} style={{ flex: 1, maxWidth: 64 }} />)}
          </View>
        ))}
      </View>
      {open && <KanaDetail kana={open.kana} roma={open.roma} onClose={() => setOpen(null)} />}
    </Screen>
  );
}
