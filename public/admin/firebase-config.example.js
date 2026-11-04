// 複製成 firebase-config.js 後填入（Firebase 主控台 → 專案設定 → 你的網頁應用程式）。
// 真正的那份不進版控：值本身不是密碼（網頁端的設定一定看得到），
// 擋住存取的是 firestore.rules 的 admins/{uid}，不是這裡。
export const firebaseConfig = {
  apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '',
};
