import { useEffect } from 'react';
import { View, Text, ActivityIndicator, AppState } from 'react-native';
import { useFonts } from 'expo-font';
// 只引入用到的三種粗細，避免把整套字型（8 種）包進 app
// Regular 做大標、Bold 做小標——字重反著用是設計系統的一部分，見 src/theme.ts
import { NotoSerifTC_400Regular } from '@expo-google-fonts/noto-serif-tc/400Regular';
import { NotoSerifTC_500Medium } from '@expo-google-fonts/noto-serif-tc/500Medium';
import { NotoSerifTC_700Bold } from '@expo-google-fonts/noto-serif-tc/700Bold';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/state/auth';
import { DataProvider } from './src/state/data';
import { firebaseConfigured } from './src/lib/firebase';
import AppNavigator from './src/navigation';
import { track, flushAnalytics, loadAnalyticsChoice } from './src/lib/analytics';
import { syncReminders } from './src/lib/reminders';

function SetupNeeded() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#FBF7F1' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#4F1620' }}>還差一步：設定 Firebase</Text>
      <Text style={{ fontSize: 15, color: '#6B5F60', marginTop: 12, lineHeight: 24 }}>
        打開專案裡的 .env，填入 Firebase 的設定值，{'\n'}存檔後在終端機按 Ctrl+C，再執行 npm start。{'\n\n'}步驟請看 README.md 的「二、建立 Firebase 專案」。
      </Text>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ NotoSerifTC_400Regular, NotoSerifTC_500Medium, NotoSerifTC_700Bold });

  // 切到背景時把還沒送出的事件送掉，不然最後那幾筆會跟著 app 一起消失
  useEffect(() => {
    // 先讀回「不要分析我」的選擇再送第一個事件，不然關掉的人每次冷啟動還是會漏一筆
    loadAnalyticsChoice().then(() => track('app_open'));
    // 重裝或換手機會把排程清掉，但開關還留著——每次冷啟動重排一次最省事，成本是零
    syncReminders();
    const sub = AppState.addEventListener('change', st => { if (st !== 'active') flushAnalytics(); });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7F1' }}><ActivityIndicator color="#8A2432" /></View>;
  }
  if (!firebaseConfigured) return <SetupNeeded />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
