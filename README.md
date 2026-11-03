# 皓學日語 v2

React Native（Expo）＋ Firebase ＋ Claude AI。

## 功能

- **生活主題課程**：13 大類、83 個生活主題（飲食、交通、居住、購物、手續、健康、工作、敬語、社交、娛樂、季節文化、情緒、道地口語），每個主題 3 堂一般課程：基本說法、道地說法、情境練習；AI 對話統一在「AI 教練」分頁
- 程度只決定難度，不鎖住主題；依學習目標推薦主題
- **五十音**：平假名、片假名各 5 課，附字源聯想和五十音表
- **AI 情境會話**：13 個情境，AI 扮演站員、店員、面試官等角色，每句即時糾正並建議下一句
- **AI 會話分析**：文法、用詞、禮貌程度、流暢度評分，整理要記的句子
- **AI 句子健檢**：寫一句日文，AI 改正並提供其他說法與語氣差異
- **單字本**：課程、會話、報告裡都能收藏，間隔複習
- **登入**：Apple、Google、訪客試用（訪客之後可綁定帳號，紀錄不遺失），進度雲端同步
- **自然語音**：Google 神經語音（男女聲依角色），可調語速，播過一次存在手機
- **語音輸入**：AI 會話與句子健檢可以直接用說的（手機內建辨識，免費）
- 紅白品牌配色、每日目標、XP、連續天數、深色模式、刪除帳號

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

**啟用自然語音**：打開下面網址按「啟用」，再部署一次後端。
```
https://console.cloud.google.com/apis/library/texttospeech.googleapis.com?project=haogaku-60c56
```
Text-to-Speech 有每月免費額度，超過後依字數計費；短句加上手機快取，成本很低。語音每日次數在 `TTS_LIMITS` 調整。

部署完成後，**在 Expo Go 用「先試用」就能測試 AI 會話與自然語音**。語音輸入（麥克風）需要開發版 App。

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

## 預先產生課程（上架前必做）

讓所有主題課隨 app 內建，用戶打開立即開始、離線也能用、不花 AI 額度。

```
ANTHROPIC_API_KEY=sk-ant-你的金鑰 npm run generate-lessons -- --levels=L2,L3
```

- 產生 83 個主題 × 3 堂 × 2 種程度 = 498 堂，約 30〜45 分鐘
- 入門程度會使用初級版本、高級程度會使用中級版本；想要 4 種程度都有，拿掉 `--levels=L2,L3`（996 堂）
- 中途中斷或有失敗，再執行一次同樣的指令就會從沒做完的繼續
- 只重做某個主題：加上 `--only=ramen --force`
- 結果在 `src/content/generated/lessons.json`，可以直接打開檢查、修改日文內容，存檔後重新整理 app 就會生效

新增主題後，再執行一次就會只產生新的部分。

## AI 課程內容的管理（後備）

沒有預先產生的主題（例如上架後新增的），第一次有人打開時才由 AI 產生，存在 Firestore 的 `lessons` 集合，之後所有人共用；進入主題頁時會在背景先準備好。

- 想檢查或修改內容：Firebase 主控台 → Firestore → `lessons`，直接編輯 `steps` 裡的文字
- 想重新產生某一課：刪掉那份文件，下次有人打開就會重新產生
- 文件裡的 `reviewed` 欄位可以拿來標記你審核過的課程
- 課程用的模型在 `functions/src/index.ts` 的 `LESSON_MODEL`，會話用的是 `MODEL`

## 新增內容

- **新情境課**：在 `src/content/scenes.ts` 照格式新增，加進 `curriculum.ts` 的單元
- **新主題**：在 `src/content/topics.ts` 新增一行（名稱、涵蓋內容、AI 角色、情境、任務），課程和 AI 會話會自動產生，不用改後端
