import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useNavTheme, fonts } from './theme';
import { useAuth } from './state/auth';
import { useData } from './state/data';
import { ChatReport } from './lib/ai';
import { PlanId } from './content/plans';

import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import CourseScreen from './screens/CourseScreen';
import AIHubScreen from './screens/AIHubScreen';
import WordbookScreen from './screens/WordbookScreen';
import ProfileScreen from './screens/ProfileScreen';
import LessonScreen from './screens/LessonScreen';
import ChatScreen from './screens/ChatScreen';
import ReportScreen from './screens/ReportScreen';
import ReviewScreen from './screens/ReviewScreen';
import KanaChartScreen from './screens/KanaChartScreen';
import SlangScreen from './screens/SlangScreen';
import ReadingsScreen from './screens/ReadingsScreen';
import ReadingScreen from './screens/ReadingScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import PlansScreen from './screens/PlansScreen';
import PurchaseScreen from './screens/PurchaseScreen';
import TopicScreen from './screens/TopicScreen';
import LessonContentScreen from './screens/LessonContentScreen';
import EditProfileScreen from './screens/EditProfileScreen';

export type RootStack = {
  Tabs: undefined;
  Topic: { topicId: string };
  Lesson: { lessonId: string; step?: number; at?: number };
  LessonContent: { lessonId: string };
  EditProfile: undefined;
  Chat: { scenarioId: string; lessonId?: string };
  Report: { report: ChatReport; scenarioId: string; lessonId?: string };
  Review: undefined;
  KanaChart: undefined;
  Slang: undefined;
  Reading: { readingId: string };
  Leaderboard: undefined;
  Plans: undefined;
  Purchase: { planId: PlanId; cycle?: 'monthly' | 'yearly' };
};
export type Tabs = { Home: undefined; Course: undefined; Readings: undefined; AI: undefined; Words: undefined; Me: undefined };
export type StackProps<K extends keyof RootStack> = NativeStackScreenProps<RootStack, K>;

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator<Tabs>();

const tabIcons: Record<keyof Tabs, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Course: ['grid', 'grid-outline'],
  Readings: ['book', 'book-outline'],
  AI: ['sparkles', 'sparkles-outline'],
  Words: ['bookmark', 'bookmark-outline'],
  Me: ['person-circle', 'person-circle-outline'],
};

function MainTabs() {
  const t = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: t.primary,
      tabBarInactiveTintColor: t.faint,
      tabBarStyle: { backgroundColor: t.surface, borderTopWidth: 0, height: 86, paddingTop: 8,
        shadowColor: t.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
      // 6 格之後每格只剩約 65pt，11pt 的「AI 教練」會被擠到換行。
      // 降到 10pt 並把字距收緊，四字標籤才排得下
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: -0.3 },
      tabBarItemStyle: { paddingHorizontal: 0 },
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} size={size} color={color} />
      ),
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首頁' }} />
      <Tab.Screen name="Course" component={CourseScreen} options={{ title: '主題' }} />
      <Tab.Screen name="Readings" component={ReadingsScreen} options={{ title: '讀物' }} />
      <Tab.Screen name="AI" component={AIHubScreen} options={{ title: 'AI 教練' }} />
      <Tab.Screen name="Words" component={WordbookScreen} options={{ title: '單字本' }} />
      <Tab.Screen name="Me" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

function Loading() {
  const t = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator color={t.primary} /></View>;
}

export default function AppNavigator() {
  const navTheme = useNavTheme();
  const t = useTheme();
  const { user, ready } = useAuth();
  const { loaded, profile } = useData();

  if (!ready) return <Loading />;
  if (!user) return <LoginScreen />;
  if (!loaded) return <Loading />;
  if (!profile.onboarded) return <OnboardingScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{
        headerTintColor: t.ink, headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false,
        headerTitleStyle: { color: t.heading, fontSize: 17, fontWeight: '700' },
        headerBackTitle: '返回', contentStyle: { backgroundColor: t.bg },
      }}>
        <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Topic" component={TopicScreen} options={{ title: '' }} />
        <Stack.Screen name="Lesson" component={LessonScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="LessonContent" component={LessonContentScreen} options={{ title: '單元內容' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: '編輯個人資料' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI 會話' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: '會話分析', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '單字複習' }} />
        <Stack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音表' }} />
        <Stack.Screen name="Slang" component={SlangScreen} options={{ title: '日本流行語' }} />
        {/* 讀物的標題橫幅要頂到畫面最上緣，所以不用系統 header，返回靠手勢和底部按鈕 */}
        <Stack.Screen name="Reading" component={ReadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: '排行榜' }} />
        {/* 方案頁自己有深色殼和返回鈕，不用系統 header */}
        <Stack.Screen name="Plans" component={PlansScreen} options={{ headerShown: false }} />
        {/* 購買頁也自己畫頂欄，而且用 modal 呈現——付款是一段有始有終的流程，
            用往上推的卡片比橫向 push 更清楚它可以隨時關掉 */}
        <Stack.Screen name="Purchase" component={PurchaseScreen}
          options={{ headerShown: false, presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
