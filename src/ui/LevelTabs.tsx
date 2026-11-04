import { View, Pressable, Text } from 'react-native';
import { useTheme, space, radius } from '../theme';
import { LevelId } from '../content/types';
import { levelOrder, levelShort, levelJlpt } from '../content/curriculum';

/**
 * 日語程度頁籤。
 *
 * 原本藏在「我的 → 學習設定」，要點進分頁再往下滑才看得到，
 * 而且是「點一下換下一個」的循環式——想從 L4 回 L1 要點三下，
 * 也看不出總共有幾階。程度會影響整個主題頁的推薦和「進階」標記，
 * 所以它該待在主題頁上面，四階一次攤開。
 *
 * 選中的用深色殼底白字（和 Segmented 同一套語言），不用酒紅——
 * 主題頁已經有酒紅的 Foundation 大卡，一個畫面只留一塊飽和色。
 */
export default function LevelTabs({ value, onChange }: { value: LevelId; onChange: (v: LevelId) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: radius.pill, padding: 4, gap: 2 }}>
      {levelOrder.map(id => {
        const on = id === value;
        return (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={`${levelShort[id]} ${levelJlpt[id]}`}
            onPress={() => onChange(id)}
            style={({ pressed }) => ({
              flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: 'center',
              backgroundColor: on ? t.shell : 'transparent', opacity: pressed ? 0.75 : 1,
            })}>
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.3, color: on ? '#FFFFFF' : t.sub }}>
              {levelShort[id]}
            </Text>
            <Text style={{ fontSize: 10, marginTop: 1, color: on ? 'rgba(255,255,255,0.7)' : t.faint }}>
              {levelJlpt[id]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
