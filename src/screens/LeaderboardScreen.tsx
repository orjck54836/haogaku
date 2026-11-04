import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { T, Card, Pill, Button, Rule } from '../ui';
import { Seal } from '../ui/seal';
import { PageHeader } from '../ui/brand';
import { useTheme, space, radius, fonts } from '../theme';
import { useData, LeaderRow } from '../state/data';
import { useAuth } from '../state/auth';
import { rankOf, rankState } from '../lib/rank';
import { db } from '../lib/firebase';

const TOP_N = 100;

/**
 * 排行榜。
 *
 * 只讀 leaderboard 集合（公開欄位），不碰 users——別人的單字本和自我介紹
 * 不在這裡，也讀不到。退出排行榜的人連那一筆都會被刪掉。
 *
 * 版面上刻意**不做前三名的獎台**：這個 app 的使用者多半是零星幾十人在學，
 * 做獎台會讓第 4 名之後的人覺得自己不存在。一視同仁的列表加上
 * 「你在這裡」的高亮，對長期學習的動機比較友善。
 */
export default function LeaderboardScreen() {
  const t = useTheme();
  const d = useData();
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(TOP_N)));
      setRows(snap.docs.map(x => ({ uid: x.id, ...(x.data() as Omit<LeaderRow, 'uid'>) })));
    } catch (e: any) {
      // 權限被拒和連不上網是兩件事，訊息不能混為一談——
      // 叫一個其實是規則沒部署的人「檢查網路」，他會一直重試到放棄
      setError(e?.code === 'permission-denied'
        ? '排行榜還沒啟用。請管理者部署 Firestore 規則（firebase deploy --only firestore:rules）'
        : '讀不到排行榜，請確認網路後再試一次');
      // 失敗時不要退成空陣列：空陣列的意思是「榜上沒有人」，
      // 會讓下面的名次誤報成「前 100 名以外」
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const me = rankState(d.progress.xp);
  const myIndex = rows ? rows.findIndex(r => r.uid === user?.uid) : -1;
  const inList = myIndex >= 0;

  const myPlace = !d.profile.leaderboard ? '未參加排行榜'
    : loading ? '載入中⋯⋯'
    : !rows ? '—'                       // 讀不到榜單時，名次是未知，不是「榜外」
    : inList ? `第 ${myIndex + 1} 名`
    // 榜還沒滿卻找不到自己，代表只是還沒同步上去（或還沒賺到 XP），
    // 講「前 100 名以外」會讓一個第 3 名的人以為自己墊底
    : rows.length < TOP_N ? '尚未上榜'
    : `前 ${TOP_N} 名以外`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.section * 2 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}>
        <PageHeader ja="ランキング" title="學習排行榜"
          subtitle={`依累積 XP 排名，前 ${TOP_N} 名。下拉可以更新`} />

        {/* 自己那一張永遠放最上面：不用往下捲去找「我在哪」 */}
        <Card tone="soft" style={{ marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Seal kanji={me.rank.kanji} size={46} tone="wine" />
            <View style={{ flex: 1 }}>
              <T variant="caption" color={t.faint}>我的名次</T>
              <T variant="heading" style={{ marginTop: 1 }}>{myPlace}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.5 }} color={t.ink}>{d.progress.xp}</T>
              <T variant="caption" color={t.sub}>XP · Lv.{me.rank.n}</T>
            </View>
          </View>
          {!d.profile.leaderboard ? (
            <View style={{ marginTop: space.md }}>
              <T variant="caption" color={t.sub}>
                你目前沒有出現在排行榜上。要參加的話，到「我的 → 學習設定 → 排行榜」打開。
              </T>
            </View>
          ) : null}
        </Card>

        {loading ? (
          <View style={{ paddingVertical: space.section * 2, alignItems: 'center' }}>
            <ActivityIndicator color={t.primary} />
          </View>
        ) : error ? (
          <View style={{ paddingVertical: space.section, alignItems: 'center', gap: space.lg }}>
            <Ionicons name="cloud-offline-outline" size={40} color={t.faint} />
            <T color={t.sub} style={{ textAlign: 'center' }}>{error}</T>
            <Button label="再試一次" variant="secondary" onPress={load} />
          </View>
        ) : !rows || rows.length === 0 ? (
          <View style={{ paddingVertical: space.section, alignItems: 'center', gap: space.sm }}>
            <Ionicons name="trophy-outline" size={40} color={t.faint} />
            <T variant="heading">還沒有人上榜</T>
            <T variant="small" color={t.sub} style={{ textAlign: 'center' }}>
              完成一堂課就會出現在這裡，第一名現在是你的。
            </T>
          </View>
        ) : (
          <View style={{ marginTop: space.xl }}>
            {rows.map((r, i) => (
              <View key={r.uid}>
                {i > 0 ? <Rule /> : null}
                <LeaderItem row={r} place={i + 1} isMe={r.uid === user?.uid} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeaderItem({ row, place, isMe }: { row: LeaderRow; place: number; isMe: boolean }) {
  const t = useTheme();
  const rank = rankOf(row.xp);
  // 前三名用金色數字當標記，但不做獎台——排版維持一致
  const placeColor = place <= 3 ? t.gold : t.faint;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md,
      paddingHorizontal: isMe ? space.md : 0, marginHorizontal: isMe ? -space.md : 0,
      backgroundColor: isMe ? t.primarySoft : 'transparent', borderRadius: isMe ? radius.lg : 0,
    }}>
      <View style={{ width: 30, alignItems: 'center' }}>
        <Text style={{ fontSize: place >= 100 ? 15 : 18, fontWeight: '800', letterSpacing: -0.5, color: placeColor }}>
          {place}
        </Text>
      </View>
      <Seal kanji={rank.kanji} size={38} tone={place <= 3 ? 'gold' : 'soft'} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>{row.name}</T>
          {isMe ? <Pill label="你" color={t.primary} bg="#FFFFFF" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 1 }}>
          <T variant="caption" color={t.sub}>Lv.{rank.n} {rank.name}</T>
          {row.jaName ? (
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 12, color: t.faint }} numberOfLines={1}>
              {row.jaName}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T style={{ fontSize: 16, fontWeight: '800', letterSpacing: -0.4 }} color={t.ink}>{row.xp}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {row.streak > 0 ? <>
            <Ionicons name="flame" size={11} color={t.accent} />
            <T variant="caption" color={t.sub}>{row.streak}</T>
          </> : <T variant="caption" color={t.faint}>XP</T>}
        </View>
      </View>
    </View>
  );
}
