import { useState } from 'react';
import { View, Text, Alert, Platform, Image } from 'react-native';
import { Screen, T, Button } from '../ui';
import { useTheme, space, radius, type } from '../theme';
import { useAuth } from '../state/auth';
import { Logo } from '../ui/brand';
import { Seal } from '../ui/seal';
import { heroImage } from '../ui/images';

export default function LoginScreen() {
  const t = useTheme();
  const { signInGoogle, signInApple, signInGuest } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e: any) { Alert.alert('登入失敗', e?.message ?? '請稍後再試'); }
    finally { setBusy(null); }
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']} padded={false}>
      {/* 上半：酒紅大色塊，整頁唯一鋪滿的顏色 */}
      <View style={{
        flex: 1, backgroundColor: t.primary, margin: space.md, marginBottom: 0,
        borderRadius: radius.xl, padding: space.xl, overflow: 'hidden',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        {/* 主視覺已經是 logo 時就不要再放一次，只留字標 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {heroImage ? null : <Logo size={34} />}
          <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 }]}>HAOGAKU JAPANESE</Text>
        </View>

        {/* 有登記主視覺就放圖，沒有就用漢字章排版（見 src/ui/images.ts） */}
        {heroImage ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: space.lg }}>
            <Image source={heroImage} accessibilityLabel="皓學" resizeMode="contain"
              style={{ width: 190, height: 190, maxWidth: '100%' }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm, marginVertical: space.xl }}>
            {['話', '食', '交', '敬'].map((k, i) => (
              <View key={k} style={{ transform: [{ rotate: `${(i - 1.5) * 4}deg` }, { translateY: i % 2 ? 10 : 0 }] }}>
                <Seal kanji={k} size={62} tone={i === 0 ? 'gold' : 'ink'} />
              </View>
            ))}
          </View>
        )}

        {/* 字標、主視覺、標題同一條中軸：logo 本來就是置中的，
            只有這一段靠左時，整張卡看起來像沒對齊的兩半 */}
        <View style={{ alignSelf: 'stretch' }}>
          <Text style={[type.display, { color: '#FFFFFF', fontSize: 40, lineHeight: 46, textAlign: 'center' }]}>從生活的角度{'\n'}真正學好日文</Text>
          <Text style={[type.body, { color: 'rgba(255,255,255,0.78)', marginTop: space.md, textAlign: 'center' }]}>
            從五十音、生活大小事，到職場敬語。
          </Text>
        </View>
      </View>

      {/* 下半：登入 */}
      <View style={{ gap: space.sm, padding: space.xl }}>
        {/**
         * Apple 不用 `AppleAuthenticationButton`，改用自家 Button。
         *
         * 原生那顆的字級是照按鈕高度自己算的（54pt 高算出來約 23pt），
         * 旁邊 Google 那顆是我們的 16pt，兩顆並排就一大一小，看起來像沒做完。
         * 把高度壓到字級對得上又會變成一顆明顯比較矮的按鈕，兩邊都不對。
         *
         * 文案必須是 Apple 公布的字串之一（這裡用「透過 Apple 繼續」），
         * 配黑底、Apple 標誌、圓角——自繪按鈕只要照這組規格就符合他們的規範。
         * Google 那顆跟著改成「透過」，兩行動詞不一致比字級不一致更顯眼。
         */}
        {Platform.OS === 'ios' && (
          <Button label="透過 Apple 繼續" icon="logo-apple" variant="dark" loading={busy === 'apple'} onPress={() => run('apple', signInApple)} />
        )}
        <Button label="透過 Google 繼續" icon="logo-google" variant="secondary" loading={busy === 'google'} onPress={() => run('google', signInGoogle)} />
        <Button label="試用體驗" variant="ghost" loading={busy === 'guest'} onPress={() => run('guest', signInGuest)} />
        <T variant="caption" color={t.faint} style={{ textAlign: 'center' }}>
          試用的學習紀錄之後可以綁定帳號保存
        </T>
      </View>
    </Screen>
  );
}
