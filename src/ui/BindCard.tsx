import { useEffect, useState } from 'react';
import { View, Alert, Platform } from 'react-native';
import { T, Button } from '.';
import { useTheme, space, radius } from '../theme';
import { useAuth } from '../state/auth';
import { useData } from '../state/data';
import { track } from '../lib/analytics';

/**
 * 請訪客綁定帳號的卡片。
 *
 * ## 為什麼不是只放在「我的」
 *
 * 「我的」裡一直有綁定入口，但大部分訪客從來沒點進去過：他要先自己想到
 * 「紀錄會不見」才會去找。這張卡改成在**他剛有東西可以失去的時候**出現
 * （課程完成頁、首頁的新手步驟），文案直接講他現在有多少 XP——
 * 「保存學習紀錄」是抽象的，「保存 120 XP」才是他會在意的。
 *
 * 按鈕直接就是 Apple／Google，不導去「我的」再按一次：多一頁就多一層流失。
 * 綁定成功後 `isGuest` 會變 false，這張卡自己消失，呼叫端不必處理。
 */
type Props = {
  placement: 'done' | 'home';
  style?: object;
};

export default function BindCard({ placement, style }: Props) {
  const t = useTheme();
  const a = useAuth();
  const d = useData();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  // 出現就記一次：漏斗要算「看到 → 綁定」的轉換，只記綁定的話分母是空的
  useEffect(() => {
    if (a.isGuest) track('bind_prompt_shown', { placement });
  }, [a.isGuest, placement]);

  if (!a.isGuest) return null;

  async function bind(key: 'apple' | 'google') {
    setBusy(key);
    try {
      await (key === 'apple' ? a.signInApple() : a.signInGoogle());
      track('bind_from_prompt', { placement, method: key });
    } catch (e: any) {
      Alert.alert('綁定失敗', e?.message ?? '請稍後再試');
    } finally {
      setBusy(null);
    }
  }

  const xp = d.progress.xp;
  return (
    <View style={[{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}>
      <View>
        <T variant="heading">{xp > 0 ? `綁定帳號，保存你的 ${xp} XP` : '綁定帳號，保存學習紀錄'}</T>
        <T variant="small" color={t.sub} style={{ marginTop: 4 }}>
          {'試用的紀錄只存在這台手機，重裝或換手機就找不回來。綁定後 AI 次數也會增加。'}
        </T>
      </View>
      {/* 兩顆並排：直排會把完成頁的「下一堂」擠出畫面 */}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {Platform.OS === 'ios' && a.appleAvailable ? (
          <Button label="Apple" icon="logo-apple" variant="dark" size="md" style={{ flex: 1 }}
            loading={busy === 'apple'} disabled={!!busy && busy !== 'apple'} onPress={() => bind('apple')} />
        ) : null}
        <Button label="Google" icon="logo-google" variant="outline" size="md" style={{ flex: 1 }}
          loading={busy === 'google'} disabled={!!busy && busy !== 'google'} onPress={() => bind('google')} />
      </View>
    </View>
  );
}
