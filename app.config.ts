import { ExpoConfig, ConfigContext } from 'expo/config';

// 沿用 app.json 的設定，只覆蓋需要的欄位
const googleScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '皓學日語',
  slug: config.slug ?? 'haogaku-app',
  version: '2.0.0',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.formaglobal.haogaku',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: { ...(config.ios?.infoPlist ?? {}), ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    ...config.android,
    package: 'com.formaglobal.haogaku',
  },
  plugins: [
    ...(config.plugins ?? []),
    'expo-apple-authentication',
    ['expo-speech-recognition', {
      microphonePermission: '皓學日語需要使用麥克風，讓你用說的和 AI 練習日語會話。',
      speechRecognitionPermission: '皓學日語需要使用語音辨識，把你說的日語轉成文字。',
    }],
    // 填好 Google 設定後才啟用，未設定時不影響啟動
    ...(googleScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleScheme }] as [string, any]] : []),
  ],
});
