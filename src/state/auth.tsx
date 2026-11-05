import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  User, onAuthStateChanged, signInAnonymously, signInWithCredential, linkWithCredential,
  unlink as fbUnlink, reauthenticateWithCredential, revokeAccessToken,
  GoogleAuthProvider, OAuthProvider, AuthCredential, signOut as fbSignOut, deleteUser,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { track } from '../lib/analytics';

/** 已綁定的登入方式，例如 apple.com、google.com */
export type ProviderId = 'apple.com' | 'google.com' | 'password';

export const providerLabels: Record<ProviderId, string> = {
  'apple.com': 'Apple', 'google.com': 'Google', password: '電子郵件',
};

/** 一個已綁定的登入方式：用來在「登入方式」清單顯示 */
export type LinkedProvider = { id: ProviderId; label: string; email: string | null };

type AuthCtx = {
  user: User | null;
  ready: boolean;
  isGuest: boolean;
  isExpoGo: boolean;
  appleAvailable: boolean;
  /** 這個帳號已經綁定哪些登入方式（訪客是空陣列） */
  linked: LinkedProvider[];
  hasProvider: (id: ProviderId) => boolean;
  signInGuest: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  /** 解除綁定。只剩一種登入方式時會擋下來，避免把自己鎖在帳號外面 */
  unlinkProvider: (id: ProviderId) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** 從 Firebase user 讀出已綁定的登入方式 */
function readLinked(u: User | null): LinkedProvider[] {
  if (!u || u.isAnonymous) return [];
  return u.providerData
    .filter(p => p.providerId in providerLabels)
    .map(p => ({ id: p.providerId as ProviderId, label: providerLabels[p.providerId as ProviderId], email: p.email ?? null }));
}

/**
 * 跑一次 Apple 登入，拿到 Firebase 憑證和 authorizationCode。
 * authorizationCode 是撤銷 token 用的（刪除帳號時 Apple 要求），只有這一刻拿得到。
 * 使用者取消時回傳 null。
 */
async function appleCredential(): Promise<{ cred: AuthCredential; authorizationCode: string | null } | null> {
  if (isExpoGo) throw new Error('Apple 登入需要使用開發版 App（Expo Go 不支援），請先用「先試用」');
  const rawNonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const res = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!res.identityToken) throw new Error('Apple 登入失敗，請再試一次');
    return {
      cred: new OAuthProvider('apple.com').credential({ idToken: res.identityToken, rawNonce }),
      authorizationCode: res.authorizationCode,
    };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

/** 跑一次 Google 登入，拿到 Firebase 憑證。使用者取消時回傳 null */
async function googleCredential(): Promise<AuthCredential | null> {
  if (isExpoGo) throw new Error('Google 登入需要使用開發版 App（Expo Go 不支援），請先用「先試用」');
  // 延遲載入：避免在 Expo Go 中因缺少原生模組而閃退
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  const res: any = await GoogleSignin.signIn();
  if (res?.type === 'cancelled') return null;
  const idToken = res?.data?.idToken ?? res?.idToken;
  if (!idToken) throw new Error('Google 登入失敗，請再試一次');
  return GoogleAuthProvider.credential(idToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [linked, setLinked] = useState<LinkedProvider[]>([]);
  const [ready, setReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // linked 存成獨立 state：綁定／解除後 Firebase 是就地更新同一個 user 物件，
  // 只 setUser 不會觸發重繪，畫面上的「已綁定」就不會更新
  const sync = (u: User | null) => { setUser(u); setLinked(readLinked(u)); };

  useEffect(() => onAuthStateChanged(auth, u => { sync(u); setReady(true); }), []);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  /**
   * 綁定或登入。
   * 目前帳號還沒綁過這個提供者就用 link（訪客和正式帳號都適用，學習紀錄不會斷）；
   * 已經綁過、或這組憑證屬於別的帳號，就改為登入那個帳號。
   */
  async function applyCredential(cred: AuthCredential) {
    const current = auth.currentUser;
    if (current && !current.providerData.some(p => p.providerId === cred.providerId)) {
      try {
        await linkWithCredential(current, cred);
        await current.reload();
        sync(auth.currentUser);
        return;
      } catch (e: any) {
        if (e?.code !== 'auth/credential-already-in-use' && e?.code !== 'auth/email-already-in-use') throw e;
        // 這個 Google／Apple 帳號已經註冊過：改為登入原本的帳號
      }
    }
    await signInWithCredential(auth, cred);
  }

  async function signInGuest() {
    await signInAnonymously(auth);
    track('login', { method: 'guest' });
  }

  async function signInGoogle() {
    const cred = await googleCredential();
    if (!cred) return;
    await applyCredential(cred);
    track('login', { method: 'google' });
  }

  async function signInApple() {
    const r = await appleCredential();
    if (!r) return;
    await applyCredential(r.cred);
    track('login', { method: 'apple' });
  }

  async function unlinkProvider(id: ProviderId) {
    const u = auth.currentUser;
    if (!u) return;
    if (readLinked(u).length <= 1) throw new Error('至少要保留一種登入方式，不然就沒辦法再登入這個帳號了');
    await fbUnlink(u, id);
    await u.reload();
    sync(auth.currentUser);
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

  /**
   * 刪除帳號。
   * 綁了 Apple 的帳號必須撤銷 token（App Store 審查要求），
   * 而撤銷需要一組新的 authorizationCode，所以會先請使用者重新驗證一次。
   * 重新驗證同時也解掉 Firebase 的 requires-recent-login 限制。
   */
  async function deleteAccount() {
    const u = auth.currentUser;
    if (!u) return;
    const ids = u.providerData.map(p => p.providerId);

    if (ids.includes('apple.com')) {
      const r = await appleCredential();
      if (!r) return;   // 使用者在 Apple 畫面取消，不刪
      await reauthenticateWithCredential(u, r.cred);
      if (r.authorizationCode) {
        // 撤銷失敗不該讓使用者刪不掉帳號，但要留紀錄
        await revokeAccessToken(auth, r.authorizationCode)
          .catch(e => console.warn('撤銷 Apple token 失敗', e));
      }
    } else if (ids.includes('google.com')) {
      const cred = await googleCredential();
      if (!cred) return;
      await reauthenticateWithCredential(u, cred);
    }

    /**
     * 後端那幾份只有 admin SDK 刪得動（usage、ttsUsage、entitlements、costs、
     * users/{uid}/reports 子集合、Storage 的大頭照），所以先叫 purgeAccount。
     *
     * **順序不能反**：`deleteUser` 一跑完，呼叫者就不再是登入狀態，
     * purgeAccount 會收到 unauthenticated，那幾份資料就永遠留在後端。
     *
     * 失敗只記 log、不中斷：刪不掉某一份統計資料，不該讓使用者刪不掉帳號。
     * （審查看的是「App 內刪得掉」，而資料清理我們自己在主控台也補得回來。）
     */
    try {
      await httpsCallable(functions, 'purgeAccount')({});
    } catch (e) {
      console.warn('purgeAccount 失敗，仍繼續刪除帳號', e);
    }

    // 這兩份本人刪得動，後端那支掛掉時當成保險再刪一次。
    // 排行榜那筆一定要刪——只刪 users 的話，帳號沒了名字還留在榜上
    await Promise.all([
      deleteDoc(doc(db, 'users', u.uid)).catch(() => {}),
      deleteDoc(doc(db, 'leaderboard', u.uid)).catch(() => {}),
    ]);
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
      linked, hasProvider: (id: ProviderId) => linked.some(p => p.id === id),
      signInGuest, signInGoogle, signInApple, unlinkProvider, signOut, deleteAccount,
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
