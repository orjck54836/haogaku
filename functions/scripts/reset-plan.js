/**
 * 把一個帳號打回免費版，用來重測購買流程。
 *
 * ## 為什麼要有這支
 *
 * 訂閱改成「可以轉移」之後（見 index.ts 的 subscriptionClaims），同一台手機上
 * **每一個新帳號冷啟動都會自動把訂閱接走**——那是刻意的（重裝、換登入方式
 * 都能自己救回來），代價是沒辦法靠「換一個帳號」測回免費版的起點。
 *
 * ## 兩邊都要清，而且有順序
 *
 * 1. **先在 iOS 取消沙盒訂閱**（設定 → App Store → 沙盒帳號 → 管理，或從 App 裡
 *    那張訂閱管理表單按「取消訂閱」），等這一期過完。沙盒的月繳約 5 分鐘一期。
 * 2. 等 Apple 那邊真的失效之後，才跑這支清 Firestore。
 *
 * 順序反過來的話白做工：Apple 的訂閱還有效，下一次冷啟動 syncPlan 問到它，
 * 又會原封不動把資格寫回來。
 *
 * ## 跑法
 *
 *   cd functions
 *   gcloud auth application-default login     # 只要做一次
 *   node scripts/reset-plan.js <uid 或 email>
 *
 * 收 email 是因為 uid 要去 Firebase Console 的 Authentication 分頁翻，
 * 而測試時最常用的就是自己那幾個登入帳號。加 --dry 只印不刪。
 */
const admin = require('firebase-admin');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'haogaku-60c56';
const [who, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry');

if (!who) {
  console.error('用法：node scripts/reset-plan.js <uid 或 email> [--dry]');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

(async () => {
  const uid = who.includes('@')
    ? (await admin.auth().getUserByEmail(who)).uid
    : who;
  if (who !== uid) console.log(`${who} → uid ${uid}\n`);

  const ent = await db.doc(`entitlements/${uid}`).get();
  console.log(ent.exists ? `entitlements/${uid}: ${JSON.stringify(ent.data())}` : `entitlements/${uid}: 不存在`);

  // claim 的 key 是 originalTransactionId，從 uid 反查——entitlement 刪掉就查不到了，所以先找
  const claims = await db.collection('subscriptionClaims').where('uid', '==', uid).get();
  claims.forEach(d => console.log(`subscriptionClaims/${d.id}: ${JSON.stringify(d.data())}`));

  // 當天的 AI 次數也一起歸零：測升級時要看得出 resetQuotaOnUpgrade 有沒有生效，
  // 帶著舊的用量進去會分不出「重置過」和「本來就沒用」
  const usage = await db.doc(`usage/${uid}`).get();
  console.log(usage.exists ? `usage/${uid}: ${JSON.stringify(usage.data())}` : `usage/${uid}: 不存在`);

  if (dry) { console.log('\n--dry，沒有刪除任何東西'); return; }

  const batch = db.batch();
  if (ent.exists) batch.delete(ent.ref);
  claims.forEach(d => batch.delete(d.ref));
  if (usage.exists) batch.delete(usage.ref);
  await batch.commit();

  console.log(`\n清掉了：entitlement ${ent.exists ? 1 : 0} 筆、claim ${claims.size} 筆、usage ${usage.exists ? 1 : 0} 筆`);
  console.log('Apple 那邊的訂閱如果還有效，下次冷啟動會再接回來——先確認它已經過期。');
})().catch(e => { console.error(e); process.exit(1); });
