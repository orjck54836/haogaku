import { useState } from 'react';
import { View, Alert, Platform, useColorScheme } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Screen, T, Button, StationSign } from '../ui';
import { useTheme, space } from '../theme';
import { useAuth } from '../state/auth';

export default function LoginScreen() {
  const t = useTheme();
  const { signInGoogle, signInApple, signInGuest, appleAvailable, isExpoGo } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const dark = useColorScheme() === 'dark';

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e: any) { Alert.alert('登入失敗', e?.message ?? '請稍後再試'); }
    finally { setBusy(null); }
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <T variant="caption" color={t.primary} style={{ letterSpacing: 2 }}>HAOGAKU NIHONGO</T>
        <T variant="display" style={{ marginTop: space.sm }}>皓學日語</T>
        <T color={t.sub} style={{ marginTop: space.sm, lineHeight: 22 }}>
          通勤 3 分鐘，練好在日本真正會用到的話。{'\n'}AI 教練陪你從五十音說到職場敬語。
        </T>
        <View style={{ marginTop: space.xxl }}>
          <StationSign kana="こうがく" zh="皓學" bar="出發：第一站 あ行" />
        </View>
      </View>

      <View style={{ gap: space.md }}>
        {Platform.OS === 'ios' && (appleAvailable && !isExpoGo ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={{ height: 52 }}
            onPress={() => run('apple', signInApple)}
          />
        ) : (
          <Button label="使用 Apple 繼續" icon="logo-apple" variant="dark" loading={busy === 'apple'} onPress={() => run('apple', signInApple)} />
        ))}
        <Button label="使用 Google 繼續" icon="logo-google" variant="secondary" loading={busy === 'google'} onPress={() => run('google', signInGoogle)} />
        <Button label="先試用" variant="ghost" loading={busy === 'guest'} onPress={() => run('guest', signInGuest)} />
        <T variant="caption" color={t.faint} style={{ textAlign: 'center', marginTop: space.xs }}>
          試用的學習紀錄之後可以綁定帳號保存
        </T>
      </View>
    </Screen>
  );
}
