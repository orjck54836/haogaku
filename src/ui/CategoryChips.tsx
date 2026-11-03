import { ScrollView, Pressable, View, Text } from 'react-native';
import { useTheme, space } from '../theme';
import { gridCategories } from '../content/curriculum';
import { CategoryId } from '../content/topics';

export type CatFilter = CategoryId | 'all';

/**
 * 分類頁籤：純文字，選中的用粗體＋上方一個圓點標記。
 * 比填滿的膠囊安靜，一整排掃過去也不會跟卡片搶顏色。
 */
export default function CategoryChips({ value, onChange }: { value: CatFilter; onChange: (v: CatFilter) => void }) {
  const t = useTheme();
  const items: { id: CatFilter; title: string }[] = [{ id: 'all', title: '全部' }, ...gridCategories];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.xl, alignItems: 'flex-end' }}>
      {items.map(c => {
        const on = c.id === value;
        return (
          <Pressable key={c.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(c.id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingBottom: 2 })}>
            <View style={{ height: 10, justifyContent: 'center' }}>
              {on ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primary }} /> : null}
            </View>
            <Text style={{ fontSize: 17, letterSpacing: -0.3, fontWeight: on ? '800' : '500', color: on ? t.ink : t.faint }}>
              {c.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
