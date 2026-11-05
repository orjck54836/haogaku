import { ExpoConfig, ConfigContext } from 'expo/config';

// 沿用 app.json 的設定，只覆蓋需要的欄位
const googleScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
  || 'com.googleusercontent.apps.816924704019-ku81u20vmkg1cb47jdphgoa8tbto7j8c';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '皓學日語',
  slug: config.slug ?? 'haogaku-app',
  version: '1.0.0',
  // 固定淺色：品牌是米白＋酒紅，不跟系統深色模式
  userInterfaceStyle: 'light',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.formaglobal.haogaku',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      ITSAppUsesNonExemptEncryption: false,
      // 沒有這段，iOS 會在開啟相簿的瞬間直接閃退（而且審查也會退件）
      NSPhotoLibraryUsageDescription: '皓學日語需要讀取相簿，讓你挑一張照片當大頭照。',
    },
    // 上架後把 App Store ID 填進來。expo-store-review 在原生評分視窗叫不出來時
    // （例如系統已達次數上限）會用它退回商店頁；沒填就只是不退回，不會壞掉：
    // appStoreUrl: 'https://apps.apple.com/tw/app/id0000000000',
  },
  android: {
    ...config.android,
    package: 'com.formaglobal.haogaku',
  },
  plugins: [
    ...(config.plugins ?? []),
    'expo-apple-authentication',
    // App 內購買（StoreKit 2）。只有 config plugin，JS 那邊一律走 src/lib/iap.ts 的
    // 探測式載入——裝了套件但沒重 build 的 dev client 不該一啟動就死
    'expo-iap',
    // 啟動畫面。沒有這段 app.json 也沒有 splash 設定，開啟會是一片純白，
    // 接著跳到 App.tsx 等字型的米白底——白閃一下再換色很廉價。
    //
    // 背景色和 App.tsx 字型載入中那一屏同一個米白（theme 的 cream），
    // 整段啟動看起來就是同一塊底色上換內容，沒有閃白。
    //
    // 只設 config plugin、**不在 JS 裡 import expo-splash-screen**：
    // 它是原生模組，頂層 import 會讓沒重 build 的 dev client 一啟動就死
    // （見 CLAUDE.md「新裝的原生模組不要頂層 import」）。
    // 靜態啟動畫面不需要 JS API，字型載入中那一屏已經接得上。
    ['expo-splash-screen', {
      image: './assets/splash-icon.png',
      backgroundColor: '#F8F3EA',
      // contain＋200pt：logo 本身是 1024 見方滿版的，不限寬會鋪到整個螢幕
      resizeMode: 'contain',
      imageWidth: 200,
    }],
    ['expo-speech-recognition', {
      microphonePermission: '皓學日語需要使用麥克風，讓你用說的和 AI 練習日語會話。',
      speechRecognitionPermission: '皓學日語需要使用語音辨識，把你說的日語轉成文字。',
    }],
    // 填好 Google 設定後才啟用，未設定時不影響啟動
    ...(googleScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleScheme }] as [string, any]] : []),
  ],
});
