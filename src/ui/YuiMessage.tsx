import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Pressable } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius, fonts } from '../theme';
import { InboxMsg, inboxTime, inboxVisible } from '../lib/inbox';
import { track } from '../lib/analytics';
import { useData } from '../state/data';

/**
 * 按了「稍後」的那幾則，只在這次開 App 期間藏起來，不刪掉。
 *
 * 「稍後」的意思是現在不想回，不是不要這則：刪掉的話晚上那則通知也跟著沒了，
 * 而通知才是他真的有空的時候。首頁、AI 教練頁和分頁上的紅點共用這一份，
 * 在首頁按掉之後切到 AI 教練頁不該又看到同一則。
 */
const hidden = new Set<string>();
const listeners = new Set<() => void>();

/** 現在該顯示的那則（已送達、沒過期、沒按稍後），沒有就是 null */
export function useYuiInbox() {
  const d = useData();
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump(n => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  const m = d.progress.inbox;
  return {
    msg: inboxVisible(m) && !hidden.has(m.id) ? m : null,
    hide: () => { if (m) { hidden.add(m.id); listeners.forEach(f => f()); } },
  };
}

/**
 * ゆい傳來的訊息，長得像手機上的聊天通知。
 *
 * 刻意做成通知的樣子，不做成又一張功能卡：首頁的卡片都是「App 叫你做的事」，
 * 看多了會自動略過；一則有名字、有時間、有未讀點的訊息，大家的反射動作是點開。
 *
 * 放在深色殼上、酒紅大卡的上面，白底大圓角——深底上的白塊是整頁最先被看到的東西，
 * 而且不會跟「一個畫面只有一塊飽和色」打架。
 *
 * 整張都能點，點了直接進對話；「稍後」只是收掉這一則，不是關掉功能。
 */
export default function YuiMessage({ msg, where, onOpen, onDismiss }: {
  msg: InboxMsg;
  /** 分析用：首頁還是 AI 教練頁 */
  where: 'home' | 'ai';
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();

  // 同一則在同一頁只記一次曝光；換了一則才再記
  useEffect(() => { track('inbox_shown', { kind: msg.kind, where }); }, [msg.id, where]);

  return (
    <Pressable tapId="ゆい訊息" accessibilityRole="button" accessibilityLabel={`ゆい傳來訊息：${msg.zh || msg.ja}。點一下回覆`}
      onPress={() => { track('inbox_open', { via: where, kind: msg.kind }); onOpen(); }}
      style={({ pressed }) => ({
        flexDirection: 'row', gap: space.md,
        padding: space.lg, borderRadius: radius.lg, backgroundColor: t.surface,
        opacity: pressed ? 0.85 : 1,
      })}>
      {/* 頭像用名字的第一個假名，不用照片：照片會是一張可辨識的人臉（見 CREDITS.md 的規則） */}
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.serifMedium, fontSize: 20, color: t.primary }}>ゆ</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <T variant="heading" style={{ fontWeight: '800' }}>ゆい</T>
          <T variant="caption" color={t.faint}>日本朋友</T>
          <View style={{ flex: 1 }} />
          <T variant="caption" color={t.faint}>{inboxTime(msg.deliverAt)}</T>
          {/* 未讀點：一看就知道這是「還沒看的訊息」，不是一張說明卡 */}
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary, marginLeft: 2 }} />
        </View>

        <Text numberOfLines={2} style={{ fontFamily: fonts.serifMedium, fontSize: 16, lineHeight: 24, color: t.ink, marginTop: 4 }}>
          {msg.ja}
        </Text>
        {msg.zh ? <T variant="caption" color={t.sub} numberOfLines={1} style={{ marginTop: 2 }}>{msg.zh}</T> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.md }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingVertical: 7, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: t.primary,
          }}>
            <Ionicons name="chatbubble" size={13} color={t.onPrimary} />
            <T variant="small" color={t.onPrimary} style={{ fontWeight: '800' }}>回覆</T>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="稍後再回" hitSlop={10}
            onPress={() => { track('inbox_dismiss', { kind: msg.kind, where }); onDismiss(); }}>
            <T variant="small" color={t.faint}>稍後</T>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
