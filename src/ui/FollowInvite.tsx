import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './index';
import { useTheme, space, radius } from '../theme';
import { useData } from '../state/data';
import { igUrl, markInvited, openFollow, shouldInvite } from '../lib/follow';

/**
 * 追蹤 IG 的邀請。
 *
 * ## 為什麼不是只擺在「我的」頁尾
 *
 * 原本 IG 只出現在 `OfficialLinks` 的那一列，位置是「我的」整頁的最後一段，
 * 在排行榜卡、方案卡、學習設定、每日提醒之後——實測會被整個滑過去，
 * 跟方案入口和排行榜入口踩過的是同一個坑（兩者後來都改成了色塊）。
 *
 * 所以多兩個位置，但**都挑有內容銜接的地方**，不做橫幅、不做彈窗：
 * - `slang`：流行語頁的頁尾。App 裡每天一個流行語，IG 上也有每日一句，
 *   此刻使用者正好對這類內容有興趣，接起來是內容的延續而不是廣告。
 * - `done`：課程／讀物的完成頁，但**和評價詢問互斥**（見下）。
 *
 * ## 為什麼完成頁要互斥
 *
 * 完成頁已經是評價詢問的位置。兩個一起出現會互相稀釋，而評價的價值更高
 * （影響商店排名和下載轉換）。所以只在這一次「不問評價」時才顯示——
 * 那是絕大多數的完成次數（評價一輩子只問 3 次），等於不花成本多一個版位。
 *
 * 時機由 `lib/follow.ts` 判斷，而且是**非同步**的（要讀 AsyncStorage），
 * 所以在 effect 裡問一次存進 state，不寫在 render 的判斷式裡——
 * 這條是專案的硬規則：在 render 裡丟錯是整頁白掉。
 */

type Props = {
  placement: 'slang' | 'done';
  /**
   * 這一次有沒有要問評價。只有 `done` 用得到：
   * true 就整個不顯示，把完成頁讓給評價彈窗。
   */
  reviewing?: boolean;
  style?: object;
};

export default function FollowInvite({ placement, reviewing = false, style }: Props) {
  const t = useTheme();
  const d = useData();
  const gated = placement === 'done';
  // 流行語頁是常駐的，不必等判斷；完成頁要等 AsyncStorage 回來才知道
  const [show, setShow] = useState(!gated);

  useEffect(() => {
    if (!gated || reviewing) return;
    let alive = true;
    shouldInvite(d.progress.completed.length).then(ok => {
      if (!alive || !ok) return;
      setShow(true);
      // 真的顯示出來才記次數：判斷和記錄分開，不然重新 render 就會燒掉額度
      markInvited();
    });
    return () => { alive = false; };
  }, [gated, reviewing]);

  if (reviewing || !show || !igUrl()) return null;

  const copy = placement === 'slang'
    ? { title: 'IG 上每天也有一句', desc: '每日一句、日本生活與學員心得' }
    : { title: '追蹤 IG，每天多學一句', desc: '每日一句、日本生活與學員心得' };

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`追蹤 Instagram，${copy.desc}`}
      onPress={() => openFollow(placement)}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: space.md,
        backgroundColor: t.surface2, borderRadius: radius.lg,
        paddingVertical: space.lg, paddingHorizontal: space.lg,
        opacity: pressed ? 0.7 : 1,
        ...style,
      })}>
      {/* 飽和色只落在這顆圓形圖示上。整塊鋪金色會跟完成頁的 LEVEL UP 卡搶注意力 */}
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.gold, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="logo-instagram" size={23} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="heading" style={{ fontSize: 16 }}>{copy.title}</T>
        <T variant="small" color={t.sub} style={{ marginTop: 2 }}>{copy.desc}</T>
      </View>
      <Ionicons name="chevron-forward" size={19} color={t.faint} />
    </Pressable>
  );
}
