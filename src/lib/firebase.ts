import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 在專案根目錄的 .env 填入 Firebase 設定（參考 .env.example）
export const firebaseConfigured = !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY && !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  // 尚未設定時用暫時值，避免 app 一打開就閃退
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'not-configured',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'not-configured',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// React Native 版的登入狀態保存（關掉 app 後仍保持登入）
const getRNPersistence = (FirebaseAuth as any).getReactNativePersistence;
function createAuth() {
  try {
    return FirebaseAuth.initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) });
  } catch {
    return FirebaseAuth.getAuth(app); // 熱重載時已初始化
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-east1');
