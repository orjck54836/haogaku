import { useEffect, useState } from 'react';
import { setScreen } from '../lib/analytics';
import { View, Text, Alert, Platform, Image, useWindowDimensions } from 'react-native';
import { Screen, T, Button } from '../ui';
import { useTheme, space, radius, type } from '../theme';
import { useAuth } from '../state/auth';
import { Logo } from '../ui/brand';
import { Seal } from '../ui/seal';
import { heroImage } from '../ui/images';

export default function LoginScreen() {
  // 登入頁在 NavigationContainer 外面，不會有 screen_view，按鈕點擊要自己標畫面
  useEffect(() => { setScreen('Login'); }, []);
  const t = useTheme();
  const { signInGoogle, signInApple, signInGuest } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  /**
   * 這頁不能捲，所有東西都得塞進一個畫面，所以尺寸不能寫死。
   *
   * 原本主視覺固定 190×270、標題 40pt，只在 iPhone 16 這種高度排得下。
   * iPad 跑的是 iPhone 相容模式（約 375×667 的窗），加上系統字級調大的 iPhone 13，
   * 剩下的高度不夠，標題就壓到按鈕上。現在主視覺吃「剩下的空間」、最多 270，
   * 矮螢幕標題退一階，字級放大也設上限——這頁的字本來就夠大，再放大只會擠爆版面。
   */
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;
  const [heroH, setHeroH] = useState(0);

  async function run(key: string, fn: () => Promise<unknown>) {
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
        alignItems: 'center',
      }}>
        {/* 主視覺已經是 logo 時就不要再放一次，只留字標 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {heroImage ? null : <Logo size={34} />}
          <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 }]}>HAOGAKU JAPANESE</Text>
        </View>

        {/**
         * 主視覺和標題是一組，一起在剩下的空間裡置中。
         *
         * 原本三塊都交給卡片的 `space-between`，等於把字標、圖、標題各推到一角，
         * 高一點的機型上圖和標題之間會拉開一大片空白，看起來不是留白是沒排完。
         * 現在只有字標固定在上緣，其餘置中，間距由 gap 決定、不隨螢幕高度膨脹。
         */}
        <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', gap: compact ? space.md : space.lg }}>
        {/* 有登記主視覺就放圖，沒有就用漢字章排版（見 src/ui/images.ts） */}
        {heroImage ? (
          // 外層 flex:1 + maxHeight：空間夠就是原本的 270，不夠就讓出來給標題。
          // 量到的高度太小時乾脆不放：一顆指甲大的 logo 比沒有更像壞掉
          <View style={{ flex: 1, maxHeight: 270, minHeight: 0, alignSelf: 'stretch' }}
            onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
            {heroH >= 60 ? (
              <Image source={heroImage} accessibilityLabel="皓學" resizeMode="contain"
                style={{ width: '100%', height: heroH }} />
            ) : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
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
          <Text maxFontSizeMultiplier={1.15} style={[type.display, { color: '#FFFFFF', fontSize: compact ? 32 : 40, lineHeight: compact ? 40 : 50, textAlign: 'center' }]}>從生活的角度{'\n'}真正學好日文</Text>
          <Text maxFontSizeMultiplier={1.3} style={[type.body, { color: 'rgba(255,255,255,0.78)', marginTop: compact ? space.sm : space.md, textAlign: 'center' }]}>
            從五十音、生活大小事、到職場敬語
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[type.body, { color: 'rgba(255,255,255,0.78)', textAlign: 'center' }]}>
            全方位強化你的日文實戰能力
          </Text>
        </View>
        </View>
      </View>

      {/* 下半：登入 */}
      {/* 寬螢幕（iPad 原生、橫放）按鈕拉滿整排會變成一條長棍，限寬置中 */}
      <View style={{ gap: space.sm, padding: compact ? space.lg : space.xl, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
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
