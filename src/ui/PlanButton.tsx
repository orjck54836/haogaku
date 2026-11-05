import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useData } from '../state/data';
import { planById } from '../content/plans';
import type { RootStack } from '../navigation';

/**
 * 深色殼頂列右上角的方案入口，同時顯示今天剩下的 AI 次數。
 *
 * 原本這裡是「我的」的人像鈕，但「我的」在底部分頁已經有一格，
 * 右上角放第二個入口等於把一個 44pt 的黃金位置花在重複的地方。
 *
 * **方案和剩餘次數併在這一顆**：兩者要回答的是同一件事（我還能用多少、
 * 不夠了要怎麼辦），分成兩處顯示會讓人在卡片和頂列之間來回對照。
 * 漢字章（「學」／「進」）拿掉了——一個 44pt 的圓章掃過去分不出是哪個字，
 * 位置卻正好夠把次數寫出來，寫數字比寫一個認不出的漢字有用。
 *
 * 免費和付費在顏色上就分開：免費是殼上的半透明白章（在場但不吵），
 * 付費是金章（這個人付過錢，要看得出來）。
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
  // 次數要等第一次呼叫 AI 回來才知道，還沒有就只顯示方案名
  const left = d.progress.aiRemaining;
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={left !== null
        ? `方案，目前是${plan.name}，今天還有 ${left} 次 AI`
        : `方案，目前是${plan.name}`}
      onPress={() => nav.navigate('Plans')} hitSlop={10}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 7,
        height: size, borderRadius: size / 2, paddingHorizontal: 14,
        backgroundColor: paid ? t.gold : 'rgba(255,255,255,0.14)',
        borderWidth: 2, borderColor: paid ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.32)',
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      {/* 方案名寫出來：使用者要知道的是「我現在是哪一個」 */}
      <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: fg }}>{plan.name}</Text>
      {left !== null ? (
        <>
          {/* 分隔點用固定寬度的 View，全形間隔號在不同字級下左右留白不對稱 */}
          <View style={{ width: 3, height: 3, borderRadius: 1.5,
            backgroundColor: fg, opacity: 0.4 }} />
          <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: -0.2, color: fg }}>
            {`${left} 次`}
          </Text>
        </>
      ) : null}
    </Pressable>
  );
}
