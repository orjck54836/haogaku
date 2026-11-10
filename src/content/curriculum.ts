import { Lesson, LevelId, Unit } from './types';
import { hiraganaLessons, katakanaLessons, dakutenLessons, yoonLessons, rhythmLesson, travelKatakana, signsLesson } from './kana';
import { subwayLesson, konbiniLesson, restaurantLesson, hotelLesson } from './scenes';
import { grammarUnits, GRAMMAR_ID } from './grammar';
import { onomatoUnits, ONOMATO_ID } from './onomatopoeia';
import { topics, Topic, CategoryId, categories } from './topics';
import type { Goal } from '../state/data';

export const levelLabels: Record<LevelId, string> = {
  L2: '初級（N5〜N4）', L3: '進階（N3〜N2）',
};
/** 標籤上的短名。全名「初級（N5〜N4）」塞不進並排的頁籤 */
export const levelShort: Record<LevelId, string> = { L2: '初級', L3: '進階' };
/** 短名下面那行小字 */
export const levelJlpt: Record<LevelId, string> = { L2: 'N5〜N4', L3: 'N3〜N2' };

export const levelOrder: LevelId[] = ['L2', 'L3'];
export const levelIndex = (id: LevelId) => levelOrder.indexOf(id);

/** 五十音基礎 */
export const basics: Unit[] = [
  // 清音學完才接濁音拗音：這兩組都是在清音字上加記號，順序顛倒的話沒有東西可以加
  { id: 'u-hira', title: '平假名', description: '從字源聯想開始，日文的基礎',
    lessons: [...hiraganaLessons, ...dakutenLessons(0), ...yoonLessons(0)], hasKanaChart: true },
  { id: 'u-kata', title: '片假名', description: '外來語、菜單和招牌都用得到',
    lessons: [...katakanaLessons, ...dakutenLessons(1), ...yoonLessons(1), travelKatakana], hasKanaChart: true },
  // 促音長音不分平／片假名：教的是拍子，兩種寫法在同一堂裡對照才看得出差別
  { id: 'u-rhythm', title: '促音與長音', description: '差一拍就是另一個字', lessons: [rhythmLesson] },
  { id: 'u-signs', title: '看懂日本', description: '車站招牌與漢字陷阱', lessons: [signsLesson] },
];
export const BASICS_ID = 'basics';

/**
 * 敬語和五十音一樣是「語言系統」，不是生活場景——
 * 所以把它從生活主題網格裡拉出來，和五十音基礎並列在主題頁最上面。
 * 底下的 6 個主題本身沒變，照樣各有 3 堂課和 AI 會話。
 */
export const KEIGO_ID = 'keigo';
export const keigoTopics = topics.filter(t => t.cat === 'keigo');

export { GRAMMAR_ID, grammarUnits } from './grammar';
export { ONOMATO_ID, onomatoUnits } from './onomatopoeia';

/**
 * 主題頁最上面那排「語言基礎」卡，依程度換成不同兩張。
 *
 * 四張卡不是同時出現：初級看五十音＋基本文法，進階看擬聲擬態語＋敬語。
 * 理由是**這四件事有先後**——初級的人需要的是把句子拆開來看懂，
 * 擬聲擬態語和敬語對他太早（擬聲擬態語沒有中文對應，敬語要先有敬體才有得比）；
 * 而進階的人再看一次五十音只是佔位置。
 *
 * 四張卡的內容全部都還在、沒有被鎖住：切換程度就看得到另外兩張，
 * 直接用網址或既有進度進去也讀得到。這裡決定的只是「現在推薦你看哪兩張」。
 */
export const foundationIds: Record<LevelId, string[]> = {
  L2: [BASICS_ID, GRAMMAR_ID],
  L3: [ONOMATO_ID, KEIGO_ID],
};

/** 四個集合各自的單元。敬語不在這裡：它底下掛的是主題，不是單元 */
export const unitsOf: Record<string, Unit[]> = {
  [BASICS_ID]: basics,
  [GRAMMAR_ID]: grammarUnits,
  [ONOMATO_ID]: onomatoUnits,
};

/**
 * 四個集合的門面資料，主題頁的卡、集合頁的抬頭、首頁的「接著上次」共用一份。
 *
 * 以前只有五十音和敬語時，這些字串散在三個畫面裡寫死——首頁甚至把
 * 「基礎」和五十音的照片當成所有非主題課程的預設值。多了兩個集合之後
 * 那個預設就錯了：讀擬聲擬態語的人會看到五十音的照片配「基礎」兩個字。
 *
 * `photoKey` 指向 images.ts 的鍵。基本文法沒有專屬照片，借用「堆疊的舊書」那張；
 * 要換成專屬的一張就只改這裡。
 */
export const collectionMeta: Record<string, {
  title: string; caption: string; focus: string; desc: string; photoKey: string;
}> = {
  [BASICS_ID]: {
    title: '五十音基礎', caption: 'ごじゅうおん', photoKey: 'basics',
    desc: '平假名、片假名、看懂招牌',
    focus: '日文的起點。從字源聯想記假名，再練到看懂招牌上的漢字。',
  },
  [GRAMMAR_ID]: {
    title: '基本文法介紹', caption: 'きそぶんぽう', photoKey: 'idioms',
    desc: '骨架、助詞、動詞、形容詞・10 堂',  // 卡片上只排得下一行，再長就會掉到第二行
    focus: '看懂和說出一句日文最少需要的東西：句尾、助詞、三個動詞形、形容詞，再加上有沒有、想不想、幾個、為什麼。學完就拆得開主題課裡的句子。',
  },
  [ONOMATO_ID]: {
    title: '擬聲擬態語', caption: 'ぎおんご・ぎたいご', photoKey: 'onomatopoeia',
    desc: '擬聲擬態語・心情、表情、口感、天氣・8 堂',
    focus: '日本人形容痛、形容口感、形容心情幾乎都靠擬聲擬態語。它沒有中文對應，要連「後面接什麼」一起記。',
  },
  [KEIGO_ID]: {
    title: '敬語', caption: 'けいご', photoKey: 'service-keigo',
    desc: `尊敬語、謙讓語、職場與服務業・${keigoTopics.length} 個主題`,
    focus: '敬語不是「更客氣的說法」，而是一套看關係決定語氣的系統。先弄懂三種敬語的分工，再分場合練。',
  },
};

/** 這堂課屬於哪一個集合；主題課回 undefined */
export function collectionOf(lessonId: string): string | undefined {
  for (const [id, units] of Object.entries(unitsOf)) {
    if (units.some(u => u.lessons.some(l => l.id === lessonId))) return id;
  }
  return undefined;
}

/** 這堂課適不適合這個程度：集合的課看 foundationIds，主題課一律可以 */
function collectionFitsLevel(lessonId: string, level: LevelId) {
  const c = collectionOf(lessonId);
  return !c || foundationIds[level].includes(c);
}

/** 生活主題網格用的分類：敬語已獨立，不在這裡重複出現 */
export const gridCategories = categories.filter(c => c.id !== 'keigo');
export const gridTopics = topics.filter(t => t.cat !== 'keigo');

/** 已經人工寫好的基本課 */
/**
 * 這四個主題的「基本說法」有手寫版，品質比產生的好，**但只有初級那一階**。
 * 所以不能直接當成這堂課的內容——那樣切到進階看到的還是同一批 N5 句子
 * （實測就是這樣：便利商店在初級和進階的基本說法一字不差）。
 * 手寫內容走 basicSteps，由 useLesson 只在初級時採用。
 */
const handwritten: Record<string, Lesson> = {
  subway: subwayLesson, konbini: konbiniLesson, restaurant: restaurantLesson, hotel: hotelLesson,
};

/** 每個主題三堂一般課程：基本說法、道地說法、情境練習（AI 對話在「AI 教練」分頁） */
export function topicLessons(t: Topic): Lesson[] {
  const basicId = `${t.id}-basic`;
  const hw = handwritten[t.id];
  const basic: Lesson = {
    id: basicId, title: '基本說法', subtitle: t.focus, kind: 'gen',
    minutes: hw?.minutes ?? 4, steps: [], topicId: t.id, genKind: 'basic',
    basicSteps: hw?.steps,
  };
  return [
    basic,
    { id: `${t.id}-native`, title: '道地說法', subtitle: '日本人真正會說的口語與語感', kind: 'gen', minutes: 4, steps: [], topicId: t.id, genKind: 'native' },
    { id: `${t.id}-practice`, title: '情境練習', subtitle: '聽懂對方說的話，選出最自然的回應', kind: 'gen', minutes: 4, steps: [], topicId: t.id, genKind: 'practice' },
  ];
}

export type LessonRef = { lesson: Lesson; topic?: Topic; group: string; index: number };

export const allLessons: LessonRef[] = [
  ...basics.flatMap(u => u.lessons.map(lesson => ({ lesson, group: u.title }))),
  // 文法和擬聲擬態語排在五十音後面、主題前面：nextLesson 的「零基礎先推五十音」
  // 靠的是 allLessons 的順序，basics 必須保持在最前面
  ...grammarUnits.flatMap(u => u.lessons.map(lesson => ({ lesson, group: u.title }))),
  ...onomatoUnits.flatMap(u => u.lessons.map(lesson => ({ lesson, group: u.title }))),
  ...topics.flatMap(topic => topicLessons(topic).map(lesson => ({ lesson, topic, group: topic.title }))),
].map((r, index) => ({ ...r, index }));

export const lessonRef = (id: string) => allLessons.find(r => r.lesson.id === id);

/**
 * 主題的單元編號。
 * 生活主題依分類順序從 01 編到 77，敬語自己一套 01〜06。
 * 編號是畫面上的身分（取代通用圖示），所以順序改了編號就會變——
 * 不要拿它當資料的 key，key 一律用 topic.id。
 */
export function topicNumber(topicId: string): string {
  const g = gridTopics.findIndex(t => t.id === topicId);
  if (g >= 0) return String(g + 1).padStart(2, '0');
  const k = keigoTopics.findIndex(t => t.id === topicId);
  if (k >= 0) return String(k + 1).padStart(2, '0');
  return '';
}

/** 單一主題，或 BASICS_ID／KEIGO_ID 這兩個集合的進度 */
export function topicProgress(topicId: string, completed: string[]) {
  const units = unitsOf[topicId];
  const ls = units ? units.flatMap(u => u.lessons)
    : topicId === KEIGO_ID ? keigoTopics.flatMap(topicLessons)
    : topicLessons(topics.find(t => t.id === topicId)!);
  return { done: ls.filter(l => completed.includes(l.id)).length, total: ls.length };
}

/** 依學習目標決定主題推薦順序 */
const goalCats: Record<Goal, CategoryId[]> = {
  travel: ['food', 'transport', 'shopping', 'home', 'fun', 'health', 'native', 'social', 'seasons', 'feelings', 'errands', 'keigo', 'work'],
  study: ['food', 'transport', 'home', 'errands', 'health', 'social', 'keigo', 'shopping', 'native', 'feelings', 'seasons', 'fun', 'work'],
  work: ['social', 'keigo', 'work', 'feelings', 'native', 'food', 'transport', 'errands', 'home', 'health', 'shopping', 'seasons', 'fun'],
  hobby: ['native', 'social', 'fun', 'food', 'feelings', 'seasons', 'transport', 'shopping', 'home', 'health', 'keigo', 'errands', 'work'],
};

export const fitsLevel = (t: Topic, level: LevelId) => !t.minLevel || levelIndex(t.minLevel) <= levelIndex(level);

export function recommendedTopics(goal: Goal, level: LevelId, completed: string[], n = 6): Topic[] {
  const order = goalCats[goal] ?? categories.map(c => c.id);
  const sorted = order.flatMap(c => topics.filter(t => t.cat === c));
  const open = sorted.filter(t => topicProgress(t.id, completed).done < 3);
  return [...open.filter(t => fitsLevel(t, level)), ...open.filter(t => !fitsLevel(t, level))].slice(0, n);
}

export function nextLesson(completed: string[], goal: Goal, level: LevelId): LessonRef {
  // 初級而且什麼都還沒上過的人，先推五十音。
  // 只看「完全沒開始」而不是只看程度：會五十音的人也會選初級，
  // 一進來就被推「平假名 あ行」會像被當成零基礎。
  if (level === 'L2' && completed.length === 0) {
    const kana = allLessons.find(r => !r.topic && !completed.includes(r.lesson.id));
    if (kana) return kana;
  }
  const topic = recommendedTopics(goal, level, completed, 1)[0];
  const ref = topic && allLessons.find(r => r.topic?.id === topic.id && !completed.includes(r.lesson.id));
  // 最後的 fallback 會掃過整份清單，所以要擋掉不屬於這個程度的集合——
  // 否則初級的人做完五十音就會被推進階才該看的擬聲擬態語
  return ref
    ?? allLessons.find(r => !completed.includes(r.lesson.id) && collectionFitsLevel(r.lesson.id, level))
    ?? allLessons.find(r => !completed.includes(r.lesson.id))
    ?? allLessons[0];
}
