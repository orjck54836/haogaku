import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  User, onAuthStateChanged, signInAnonymously, signInWithCredential, linkWithCredential,
  GoogleAuthProvider, OAuthProvider, AuthCredential, signOut as fbSignOut, deleteUser,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

type AuthCtx = {
  user: User | null;
  ready: boolean;
  isGuest: boolean;
  isExpoGo: boolean;
  appleAvailable: boolean;
  signInGuest: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** 訪客帳號登入時直接綁定，學習紀錄不會遺失 */
async function applyCredential(cred: AuthCredential) {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await linkWithCredential(current, cred);
      await current.reload();
      return;
    } catch (e: any) {
      if (e?.code !== 'auth/credential-already-in-use' && e?.code !== 'auth/email-already-in-use') throw e;
      // 這個 Google／Apple 帳號已經註冊過：改為登入原本的帳號
    }
  }
  await signInWithCredential(auth, cred);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setReady(true); }), []);
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  async function signInGuest() {
    await signInAnonymously(auth);
  }

  async function signInGoogle() {
    if (isExpoGo) throw new Error('Google 登入需要使用開發版 App（Expo Go 不支援），請先用「先試用」');
    // 延遲載入：避免在 Expo Go 中因缺少原生模組而閃退
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    await GoogleSignin.hasPlayServices();
    const res: any = await GoogleSignin.signIn();
    if (res?.type === 'cancelled') return;
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error('Google 登入失敗，請再試一次');
    await applyCredential(GoogleAuthProvider.credential(idToken));
  }

  async function signInApple() {
    if (isExpoGo) throw new Error('Apple 登入需要使用開發版 App（Expo Go 不支援），請先用「先試用」');
    const rawNonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    try {
      const res = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!res.identityToken) throw new Error('Apple 登入失敗，請再試一次');
      const cred = new OAuthProvider('apple.com').credential({ idToken: res.identityToken, rawNonce });
      await applyCredential(cred);
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      throw e;
    }
  }

  async function signOut() {
    if (!isExpoGo) {
      try {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch { /* 沒有用 Google 登入時忽略 */ }
    }
    await fbSignOut(auth);
  }

  async function deleteAccount() {
    const u = auth.currentUser;
    if (!u) return;
    await deleteDoc(doc(db, 'users', u.uid)).catch(() => {});
    try {
      await deleteUser(u);
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') throw new Error('為了安全，請先登出再重新登入，然後再刪除帳號');
      throw e;
    }
  }

  return (
    <Ctx.Provider value={{
      user, ready, isGuest: !!user?.isAnonymous, isExpoGo, appleAvailable,
      signInGuest, signInGoogle, signInApple, signOut, deleteAccount,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return c;
}
