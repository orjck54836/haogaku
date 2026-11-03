import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, T, Pill } from './index';
import { UnitBlock } from './seal';
import { useTheme, space } from '../theme';
import { Topic } from '../content/topics';
import { topicProgress } from '../content/curriculum';

/**
 * 主題卡：上面是號碼版（照片的位置），下面是標題、說明、進度。
 * aspect 由外面傳進來，故意讓每張卡高度不一樣，排出錯落的網格。
 */
export default function TopicCard({ topic, completed, onPress, advanced, aspect = 1 }: {
  topic: Topic; completed: string[]; onPress: () => void; advanced?: boolean; aspect?: number;
}) {
  const t = useTheme();
  const p = topicProgress(topic.id, completed);
  const done = p.done === p.total;
  return (
    <Card onPress={onPress} accessibilityLabel={topic.title} style={{ padding: space.sm }}>
      <UnitBlock topicId={topic.id} cat={topic.cat} aspect={aspect} />
      <View style={{ paddingHorizontal: space.xs, paddingTop: space.md, paddingBottom: space.xs }}>
        <T variant="heading" numberOfLines={1}>{topic.title}</T>
        <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{topic.focus}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={done ? t.success : t.faint} />
            <T variant="caption" color={done ? t.success : t.sub} style={{ fontWeight: '700' }}>{p.done}/{p.total}</T>
          </View>
          <View style={{ flex: 1 }} />
          {advanced ? <Pill label="進階" color={t.sub} /> : null}
        </View>
      </View>
    </Card>
  );
}
