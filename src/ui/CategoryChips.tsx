import { ScrollView, Pressable } from 'react-native';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { categories, CategoryId } from '../content/topics';

export type CatFilter = CategoryId | 'all';

export default function CategoryChips({ value, onChange }: { value: CatFilter; onChange: (v: CatFilter) => void }) {
  const t = useTheme();
  const items: { id: CatFilter; title: string }[] = [{ id: 'all', title: '全部' }, ...categories];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}>
      {items.map(c => {
        const on = c.id === value;
        return (
          <Pressable key={c.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(c.id)}
            style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: radius.pill, borderWidth: 1.5,
              borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primary : t.surface }}>
            <T style={{ fontWeight: '700', fontSize: 14 }} color={on ? t.onPrimary : t.ink}>{c.title}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
