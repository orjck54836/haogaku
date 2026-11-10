import { useState } from 'react';
import { View, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen, T, Card, Pill, Segmented } from '../ui';
import { PageHeader } from '../ui/brand';
import { photoFor } from '../ui/images';
import { useTheme, space, radius, fonts } from '../theme';
import { useData } from '../state/data';
import { readings, genreLabels, readingLessonId, todayReadingIndex, ReadingGenre, Reading } from '../content/readings';
import { levelShort } from '../content/curriculum';
import { RootStack } from '../navigation';

type Filter = ReadingGenre | 'all';

/**
 * 讀物列表。
 *
 * 照 readings.ts 的原順序排（那個順序本身是從簡單排到難的），不另外分組也不把
 * 今日那篇拉到最前面——首頁已經在推今日那篇了，這裡再排一次只會讓順序每天跳動，
 * 讀到一半的人找不到上次那篇。難度只用標籤標示，不拿來鎖：
 * 讀物不像課程有先後依賴，想挑戰 L3 的小說就讓他點進去。
 */
export default function ReadingsScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { progress } = useData();
  const [f, setF] = useState<Filter>('all');

  const todayId = readings[todayReadingIndex()].id;
  const list = f === 'all' ? readings : readings.filter(r => r.genre === f);
  const doneCount = readings.filter(r => progress.completed.includes(readingLessonId(r.id))).length;

  return (
    <Screen>
      <PageHeader ja="よみもの" title="日文小品"
        subtitle={`${readings.length} 篇短文，每篇三到五分鐘。讀完 ${doneCount} 篇`} />

      <View style={{ marginTop: space.xl }}>
        <Segmented<Filter> value={f} onChange={setF} options={[
          { value: 'all', label: '全部' },
          { value: 'story', label: '小說' },
          { value: 'essay', label: '隨筆' },
          { value: 'culture', label: '文化' },
          { value: 'news', label: '時事' },
        ]} />
      </View>

      <View style={{ gap: space.lg, marginTop: space.xl }}>
        {list.map(r => (
          <ReadingRow key={r.id} r={r} today={r.id === todayId}
            done={progress.completed.includes(readingLessonId(r.id))}
            onPress={() => nav.navigate('Reading', { readingId: r.id })} />
        ))}
      </View>
    </Screen>
  );
}

function ReadingRow({ r, done, today, onPress }: { r: Reading; done: boolean; today: boolean; onPress: () => void }) {
  const t = useTheme();
  const photo = photoFor(r.photo);
  return (
    <Card onPress={onPress} accessibilityLabel={`${r.titleZh}，${genreLabels[r.genre]}`} style={{ padding: space.sm }}>
      {/* 橫幅比例固定 16:7，列表掃下來才整齊；標題壓在圖的下緣 */}
      <View style={{ width: '100%', aspectRatio: 16 / 7, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: t.shell }}>
        {photo ? <>
          <Image source={photo} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,16,18,0.44)' }} />
        </> : null}

        <View style={{ position: 'absolute', top: space.md, left: space.md, flexDirection: 'row', gap: 6 }}>
          {today ? <Pill icon="today" label="今日" color="#231A08" bg={t.gold} /> : null}
          {done ? <Pill icon="checkmark" label="讀過" color="#FFFFFF" bg="rgba(31,122,76,0.92)" /> : null}
        </View>

        <View style={{ padding: space.md }}>
          <T style={{ fontSize: 12, fontFamily: fonts.serifRegular, letterSpacing: 1, color: 'rgba(255,255,255,0.78)' }} numberOfLines={1}>
            {r.kana}
          </T>
          {/* 標題長短差很多（「傘を忘れた日」vs「おにぎりはなぜ三角なのか」），
              直接截字會變成「…」結尾；縮字級塞進一行比較像書封 */}
          <Text style={{ fontSize: 22, lineHeight: 30, fontFamily: fonts.serif, color: '#FFFFFF' }}
            numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {r.title}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.xs, paddingTop: space.md, paddingBottom: space.xs }}>
        <T variant="heading" numberOfLines={1}>{r.titleZh}</T>
        <T variant="small" color={t.sub} style={{ marginTop: 3 }} numberOfLines={2}>{r.hook}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
          <Pill label={genreLabels[r.genre]} color={t.primary} bg={t.primarySoft} />
          <Pill label={levelShort[r.level]} color={t.sub} />
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="time-outline" size={13} color={t.faint} />
            <T variant="caption" color={t.faint}>{r.minutes} 分鐘</T>
          </View>
        </View>
      </View>
    </Card>
  );
}
