import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useNavTheme, fonts } from './theme';
import { useAuth } from './state/auth';
import { useData } from './state/data';
import { ChatReport } from './lib/ai';

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
import CheckScreen from './screens/CheckScreen';
import ReviewScreen from './screens/ReviewScreen';
import KanaChartScreen from './screens/KanaChartScreen';
import SlangScreen from './screens/SlangScreen';
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
  Check: undefined;
  Review: undefined;
  KanaChart: undefined;
  Slang: undefined;
};
export type Tabs = { Home: undefined; Course: undefined; AI: undefined; Words: undefined; Me: undefined };
export type StackProps<K extends keyof RootStack> = NativeStackScreenProps<RootStack, K>;

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator<Tabs>();

const tabIcons: Record<keyof Tabs, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Course: ['grid', 'grid-outline'],
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
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} size={size} color={color} />
      ),
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首頁' }} />
      <Tab.Screen name="Course" component={CourseScreen} options={{ title: '主題' }} />
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
        <Stack.Screen name="Check" component={CheckScreen} options={{ title: 'AI 句子健檢' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '單字複習' }} />
        <Stack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音表' }} />
        <Stack.Screen name="Slang" component={SlangScreen} options={{ title: '日本流行語' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
