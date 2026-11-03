import { View } from 'react-native';
import { Card, T, IconBox, IconName } from './index';
import { useTheme, space } from '../theme';
import { Topic } from '../content/topics';
import { topicProgress } from '../content/curriculum';

export default function TopicCard({ topic, completed, onPress, advanced }: { topic: Topic; completed: string[]; onPress: () => void; advanced?: boolean }) {
  const t = useTheme();
  const p = topicProgress(topic.id, completed);
  const done = p.done === p.total;
  return (
    <Card onPress={onPress} accessibilityLabel={topic.title} style={{ flex: 1, padding: space.md, minHeight: 132 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <IconBox name={topic.icon as IconName} color={done ? t.success : t.primary} bg={done ? t.successSoft : t.primarySoft} size={40} />
        {advanced ? <T variant="caption" color={t.faint}>進階</T> : null}
      </View>
      <T style={{ fontWeight: '800', marginTop: space.md }} numberOfLines={1}>{topic.title}</T>
      <T variant="caption" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{topic.focus}</T>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: space.sm }}>
        {Array.from({ length: p.total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < p.done ? (done ? t.success : t.primary) : t.surface2 }} />
        ))}
      </View>
    </Card>
  );
}
