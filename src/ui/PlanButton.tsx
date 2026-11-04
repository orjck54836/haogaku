import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, fonts } from '../theme';
import { useData } from '../state/data';
import { planById } from '../content/plans';
import type { RootStack } from '../navigation';

/**
 * 深色殼頂列右上角的方案入口。
 *
 * 原本這裡是「我的」的人像鈕，但「我的」在底部分頁已經有一格，
 * 右上角放第二個入口等於把一個 44pt 的黃金位置花在重複的地方。
 * 換成方案之後它同時在做兩件事：**告訴你現在是哪個方案**（漢字章就是方案的識別，
 * 和方案頁、「我的」那張金邊卡用同一個字），以及**一鍵過去升級**。
 *
 * 免費和付費在顏色上就分開：免費是殼上的半透明白章（在場但不吵），
 * 付費是金章（這個人付過錢，要看得出來）。只靠漢字不同的話，
 * 「學」和「進」在 44pt 裡掃過去分不出來。
 *
 * 只給深色殼用（首頁、AI 教練、單字本那種 Screen shell 的頂列）。
 * 淺底頁面放這顆白章會整個消失。
 */
export function PlanButton({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const d = useData();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const plan = planById(d.profile.plan);
  const paid = plan.id !== 'free';
  const fg = paid ? '#231A08' : '#FFFFFF';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`方案，目前是${plan.name}方案`}
      onPress={() => nav.navigate('Plans')} hitSlop={10}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6,
        height: size, borderRadius: size / 2, paddingLeft: 4, paddingRight: 12,
        backgroundColor: paid ? t.gold : 'rgba(255,255,255,0.14)',
        borderWidth: 2, borderColor: paid ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.32)',
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      {/* 漢字章：和方案頁、「我的」那張卡用同一個字，掃一眼就對得起來。
          明體的垂直留白比較多，關掉 includeFontPadding 才不會偏上 */}
      <View style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2,
        backgroundColor: paid ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.16)',
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: (size - 8) * 0.52, includeFontPadding: false, color: fg }}>
          {plan.kanji}
        </Text>
      </View>
      {/* 方案名寫出來：一個漢字章看得出「有這個東西」，看不出「我現在是哪一個」 */}
      <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: fg }}>{plan.name}</Text>
    </Pressable>
  );
}
