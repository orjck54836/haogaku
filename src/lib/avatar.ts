import { requireOptionalNativeModule } from 'expo-modules-core';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app, auth } from './firebase';
import { track } from './analytics';

/**
 * 大頭照：從相簿挑一張，裁成正方形，上傳到 Firebase Storage。
 *
 * ## 為什麼存 Storage 不存 Firestore
 *
 * Firestore 單一文件上限 1MB，而且 users/{uid} 是**整份重寫**的
 * （見 state/data.tsx）——把 base64 的圖塞進去，等於每次加 XP 都重傳一次照片。
 * Storage 存檔案、Firestore 只存那個網址，才是對的分工。
 *
 * ## 為什麼固定檔名
 *
 * 路徑固定是 `avatars/{uid}.jpg`，換照片直接覆蓋。
 * 用時間戳當檔名的話，換十次就留十張沒人指向的舊圖在那裡付儲存費，
 * 而且刪帳號時要先列出目錄才刪得乾淨。
 * 代價是 CDN 會快取舊圖，所以存進 profile 的網址帶 Firebase 給的 token，
 * 覆蓋後 token 會換，網址跟著變，不會看到舊照片。
 */
function loadPicker(): any | null {
  // 先探原生模組，確定在才 require——直接 require 的話，
  // 沒有這個模組的 dev client 會在載入當下就 throw（見 CLAUDE.md）
  try {
    if (!requireOptionalNativeModule('ExponentImagePicker')) return null;
    return require('expo-image-picker');
  } catch {
    return null;
  }
}

let cached: any | null | undefined;
function picker(): any | null {
  if (cached === undefined) cached = loadPicker();
  return cached;
}

/** 這個 build 能不能挑照片。畫面用它決定要不要顯示「更換照片」 */
export const avatarPickerSupported = () => !!picker();

export type AvatarResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'cancelled' | 'failed' };

/**
 * 挑一張照片並上傳，回傳可以直接放進 <Image> 的網址。
 *
 * 失敗一律用回傳值表示，不丟錯：呼叫端要分「使用者自己取消」和「真的壞了」，
 * 前者不該跳任何提示——按了取消還跳一個對話框是最煩的互動。
 */
export async function pickAndUploadAvatar(): Promise<AvatarResult> {
  const P = picker();
  if (!P) return { ok: false, reason: 'unsupported' };
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, reason: 'failed' };

  try {
    const perm = await P.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const r = await P.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,   // iOS 會給正方形裁切框
      aspect: [1, 1],
      // 0.6 + 512px：頭像最大只顯示到 64pt（@3x 約 192px），
      // 再大只是讓使用者用自己的流量上傳看不出差別的畫質
      quality: 0.6,
    });
    if (r.canceled || !r.assets?.length) return { ok: false, reason: 'cancelled' };

    // fetch 本機檔案取得 blob：RN 沒有 File API，這是上傳前唯一的標準做法
    const res = await fetch(r.assets[0].uri);
    const blob = await res.blob();

    const storageRef = ref(getStorage(app), `avatars/${uid}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    track('avatar_upload');
    return { ok: true, url };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * 移除大頭照。
 * 檔案刪不掉也當成功——使用者要的是「畫面上不要再有這張照片」，
 * 而那件事由 profile 的欄位決定；孤兒檔案最多是幾十 KB 的儲存費。
 */
export async function removeAvatar() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try { await deleteObject(ref(getStorage(app), `avatars/${uid}.jpg`)); } catch { /* 忽略 */ }
}
