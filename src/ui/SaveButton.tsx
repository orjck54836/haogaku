import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../state/data';
import { useTheme } from '../theme';

export default function SaveButton({ ja, zh, source, color, compact }: { ja: string; zh?: string; source: string; color?: string; compact?: boolean }) {
  const t = useTheme();
  const { isSaved, toggleWord } = useData();
  const saved = isSaved(ja);
  const c = saved ? t.accent : color ?? t.sub;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={saved ? `取消收藏 ${ja}` : `收藏 ${ja}`} accessibilityState={{ selected: saved }}
      onPress={() => toggleWord({ ja, zh, source })} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={c} />
      {compact ? null : <Text style={{ fontSize: 13, color: c, fontWeight: '600' }}>{saved ? '已收藏' : '收藏'}</Text>}
    </Pressable>
  );
}
