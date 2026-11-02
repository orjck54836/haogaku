# 皓學日語 v2

React Native（Expo）＋ Firebase ＋ Claude AI。

## 功能

- **系統化課程**：4 個等級（入門、旅行篇、生活篇、職場篇）→ 單元 → 課，依序解鎖，共 28 課
- **五十音**：平假名、片假名各 5 課，附字源聯想和五十音表
- **AI 情境會話**：13 個情境，AI 扮演站員、店員、面試官等角色，每句即時糾正並建議下一句
- **AI 會話分析**：文法、用詞、禮貌程度、流暢度評分，整理要記的句子
- **AI 句子健檢**：寫一句日文，AI 改正並提供其他說法與語氣差異
- **單字本**：課程、會話、報告裡都能收藏，間隔複習
- **登入**：Apple、Google、訪客試用（訪客之後可綁定帳號，紀錄不遺失），進度雲端同步
- 每日目標、XP、連續天數、深色模式、刪除帳號

---

## 一、開始使用（3 個指令）

把這個資料夾放到桌面，在終端機執行：

```
cd ~/Desktop/haogaku-japanese
npm install
npm start
```

用 Expo Go 掃 QR Code。第一次打開會看到「還差一步：設定 Firebase」，照下面第二步設定即可。

> 這個專案已經包含所有需要的套件（Expo SDK 58），不需要再執行 create-expo-app 或 expo install。

---

## 二、建立 Firebase 專案

1. 到 https://console.firebase.google.com 建立專案
2. **新增網頁應用程式**（是「網頁」，因為使用 Firebase JS SDK），把設定值填進專案裡的 `.env`，存檔後按 `Ctrl+C` 再執行 `npm start`
3. **Authentication → 登入方式**，啟用：
   - 匿名（訪客試用用）
   - Google
   - Apple
4. **Firestore Database** → 建立資料庫，地區選 `asia-east1`（台灣）
5. 專案升級為 **Blaze 方案**（Cloud Functions 需要，小流量幾乎免費，建議設預算提醒）

---

## 三、部署 AI 後端

```
npm install -g firebase-tools
firebase login
firebase use --add            # 選你的專案
cd functions && npm install && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY   # 貼上 Anthropic API 金鑰
firebase deploy --only functions,firestore:rules
```

- API 金鑰到 https://console.anthropic.com 申請，**只存在後端**，不會出現在 app 裡
- 模型與每日次數在 `functions/src/index.ts` 最上面的 `MODEL`、`LIMITS` 調整（目前訪客 10 次、會員 40 次）

部署完成後，**在 Expo Go 用「先試用」就能測試所有 AI 功能**。

---

## 四、Google 與 Apple 登入（需要開發版 App）

Expo Go 不支援 Google、Apple 原生登入，要做一個自己的開發版 App：

**Google**
1. Firebase → Authentication → Google，展開「網頁 SDK 設定」，複製**網頁用戶端 ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
2. Google Cloud 主控台（同一個專案）→ 憑證 → 建立 OAuth 用戶端 ID → 類型選 iOS，套件 ID 填 `com.formaglobal.haogaku`
3. 填入 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`，並把它反過來寫成 `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`

**Apple**
1. 需要 Apple Developer Program（年費 US$99）
2. developer.apple.com → Identifiers → 你的 App ID 勾選 **Sign In with Apple**
3. Firebase → Authentication → Apple，啟用即可（iOS 原生登入不用填服務 ID）

**打包開發版**
```
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```
完成後用 iPhone 掃描連結安裝，之後用 `npm run dev` 開發。

---

## 五、上架前檢查

- [ ] 替換 `assets/icon.png`（1024×1024，不透明）與啟動畫面
- [ ] App Store Connect 填隱私權政策網址（有收集 email 與學習紀錄）
- [ ] 隱私問卷：勾選「聯絡資訊（email）」「使用者內容」，用途為 App 功能
- [ ] 確認刪除帳號功能可用（App Store 規定）
- [ ] 使用 Apple 登入的帳號在刪除時，Apple 要求撤銷 token；正式上架前建議在後端加入撤銷流程
- [ ] 正式打包：`eas build -p ios --profile production`，再 `eas submit -p ios`

---

## 檔案結構

```
App.tsx                      進入點
src/navigation.tsx           登入判斷、分頁、頁面堆疊
src/theme.ts                 設計系統：顏色、間距、字級
src/ui/                      共用元件（卡片、按鈕、進度環、站名牌…）
src/state/auth.tsx           Apple／Google／訪客登入、綁定、刪除帳號
src/state/data.tsx           學習進度、單字本、XP，手機快取＋雲端同步
src/lib/ai.ts                呼叫 AI 後端
src/content/                 課程內容：五十音、情境課、AI 情境、流行語
src/screens/                 所有畫面
functions/src/index.ts       AI 後端：會話、分析、句子健檢、每日額度
```

## 新增內容

- **新情境課**：在 `src/content/scenes.ts` 照格式新增，加進 `curriculum.ts` 的單元
- **新 AI 情境**：在 `src/content/scenarios.ts` 新增一筆，不用改後端
