import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/state/auth';
import { DataProvider } from './src/state/data';
import { firebaseConfigured } from './src/lib/firebase';
import AppNavigator from './src/navigation';

function SetupNeeded() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F5F7FB' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F1B2D' }}>還差一步：設定 Firebase</Text>
      <Text style={{ fontSize: 15, color: '#5B677A', marginTop: 12, lineHeight: 24 }}>
        打開專案裡的 .env，填入 Firebase 的設定值，{'\n'}存檔後在終端機按 Ctrl+C，再執行 npm start。{'\n\n'}步驟請看 README.md 的「二、建立 Firebase 專案」。
      </Text>
    </View>
  );
}

export default function App() {
  if (!firebaseConfigured) return <SetupNeeded />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
