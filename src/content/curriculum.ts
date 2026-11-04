import { Lesson, LevelId, Unit } from './types';
import { hiraganaLessons, katakanaLessons, travelKatakana, signsLesson } from './kana';
import { subwayLesson, konbiniLesson, restaurantLesson, hotelLesson } from './scenes';
import { topics, Topic, CategoryId, categories } from './topics';
import type { Goal } from '../state/data';

export const levelLabels: Record<LevelId, string> = {
  L1: '入門（零基礎）', L2: '初級（N5〜N4）', L3: '中級（N3〜N2）', L4: '高級（N2〜N1）',
};
/** 標籤上的短名。全名「入門（零基礎）」塞不進四格並排的頁籤 */
export const levelShort: Record<LevelId, string> = { L1: '入門', L2: '初級', L3: '中級', L4: '高級' };
/** 短名下面那行小字 */
export const levelJlpt: Record<LevelId, string> = { L1: '零基礎', L2: 'N5〜N4', L3: 'N3〜N2', L4: 'N2〜N1' };

export const levelOrder: LevelId[] = ['L1', 'L2', 'L3', 'L4'];
export const levelIndex = (id: LevelId) => levelOrder.indexOf(id);

/** 五十音基礎 */
export const basics: Unit[] = [
  { id: 'u-hira', title: '平假名', description: '從字源聯想開始，日文的基礎', lessons: hiraganaLessons, hasKanaChart: true },
  { id: 'u-kata', title: '片假名', description: '外來語、菜單和招牌都用得到', lessons: [...katakanaLessons, travelKatakana], hasKanaChart: true },
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

/** 生活主題網格用的分類：敬語已獨立，不在這裡重複出現 */
export const gridCategories = categories.filter(c => c.id !== 'keigo');
export const gridTopics = topics.filter(t => t.cat !== 'keigo');

/** 已經人工寫好的基本課 */
const handwritten: Record<string, Lesson> = {
  subway: subwayLesson, konbini: konbiniLesson, restaurant: restaurantLesson, hotel: hotelLesson,
};

/** 每個主題三堂一般課程：基本說法、道地說法、情境練習（AI 對話在「AI 教練」分頁） */
export function topicLessons(t: Topic): Lesson[] {
  const basicId = `${t.id}-basic`;
  const hw = handwritten[t.id];
  const basic: Lesson = hw
    ? { ...hw, id: basicId, title: '基本說法', subtitle: t.focus, topicId: t.id }
    : { id: basicId, title: '基本說法', subtitle: t.focus, kind: 'gen', minutes: 4, steps: [], topicId: t.id, genKind: 'basic' };
  return [
    basic,
    { id: `${t.id}-native`, title: '道地說法', subtitle: '日本人真正會說的口語與語感', kind: 'gen', minutes: 4, steps: [], topicId: t.id, genKind: 'native' },
    { id: `${t.id}-practice`, title: '情境練習', subtitle: '聽懂對方說的話，選出最自然的回應', kind: 'gen', minutes: 4, steps: [], topicId: t.id, genKind: 'practice' },
  ];
}

export type LessonRef = { lesson: Lesson; topic?: Topic; group: string; index: number };

export const allLessons: LessonRef[] = [
  ...basics.flatMap(u => u.lessons.map(lesson => ({ lesson, group: u.title }))),
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
  const ls = topicId === BASICS_ID ? basics.flatMap(u => u.lessons)
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
  if (level === 'L1') {
    const kana = allLessons.find(r => !r.topic && !completed.includes(r.lesson.id));
    if (kana) return kana;
  }
  const topic = recommendedTopics(goal, level, completed, 1)[0];
  const ref = topic && allLessons.find(r => r.topic?.id === topic.id && !completed.includes(r.lesson.id));
  return ref ?? allLessons.find(r => !completed.includes(r.lesson.id)) ?? allLessons[0];
}
