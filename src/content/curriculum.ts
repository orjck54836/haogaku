import { Level, Lesson, LevelId, Unit } from './types';
import { hiraganaLessons, katakanaLessons, travelKatakana, signsLesson } from './kana';
import { subwayLesson, konbiniLesson, restaurantLesson, hotelLesson } from './scenes';
import { scenarioById } from './scenarios';

const aiLesson = (scenarioId: string): Lesson => {
  const s = scenarioById(scenarioId)!;
  return { id: `lesson-${scenarioId}`, title: `AI 實戰：${s.title}`, subtitle: s.goal, kind: 'ai', minutes: 5, steps: [], scenarioId };
};

const aiUnit = (id: string, title: string, description: string, ids: string[]): Unit => ({
  id, title, description, lessons: ids.map(aiLesson),
});

export const levels: Level[] = [
  {
    id: 'L1', title: '入門', jlpt: '零基礎', description: '五十音與旅途中最常見的字',
    units: [
      { id: 'u-hira', title: '平假名', description: '日文的基礎，從字源聯想開始', lessons: hiraganaLessons, hasKanaChart: true },
      { id: 'u-kata', title: '片假名', description: '外來語、菜單和招牌都用得到', lessons: [...katakanaLessons, travelKatakana], hasKanaChart: true },
      { id: 'u-signs', title: '看懂日本', description: '車站招牌與漢字陷阱', lessons: [signsLesson] },
    ],
  },
  {
    id: 'L2', title: '旅行篇', jlpt: 'N5〜N4', description: '去日本玩一定會遇到的情境',
    units: [
      { id: 'u-transport', title: '交通', description: '地鐵廣播、轉乘、問路', lessons: [subwayLesson, aiLesson('ai-station')] },
      { id: 'u-konbini', title: '便利商店', description: '結帳時的固定對話', lessons: [konbiniLesson, aiLesson('ai-konbini')] },
      { id: 'u-food', title: '餐廳', description: '從入座到結帳', lessons: [restaurantLesson, aiLesson('ai-restaurant')] },
      { id: 'u-hotel', title: '飯店', description: '入住與各種詢問', lessons: [hotelLesson, aiLesson('ai-hotel')] },
    ],
  },
  {
    id: 'L3', title: '生活篇', jlpt: 'N3〜N2', description: '留學、打工度假的真實生活',
    units: [
      aiUnit('u-life-home', '安頓生活', '找房子、辦手續', ['ai-rent', 'ai-ward']),
      aiUnit('u-life-work', '打工與日常', '面試打工、看醫生', ['ai-baito', 'ai-clinic']),
    ],
  },
  {
    id: 'L4', title: '職場篇', jlpt: 'N2〜N1', description: '日商工作的敬語與溝通',
    units: [
      aiUnit('u-biz-start', '求職', '日商面試', ['ai-interview']),
      aiUnit('u-biz-daily', '日常業務', '報連相、商務電話、接待客戶', ['ai-horenso', 'ai-phone', 'ai-keigo']),
    ],
  },
];

export type LessonRef = { lesson: Lesson; level: Level; unit: Unit; index: number };

export const allLessons: LessonRef[] = levels.flatMap(level =>
  level.units.flatMap(unit => unit.lessons.map(lesson => ({ lesson, level, unit, index: 0 })))
).map((r, i) => ({ ...r, index: i }));

export const lessonRef = (id: string) => allLessons.find(r => r.lesson.id === id);

const levelOrder: LevelId[] = ['L1', 'L2', 'L3', 'L4'];
export const levelIndex = (id: LevelId) => levelOrder.indexOf(id);

/** 起始程度以下的課程全部開放；其餘依序解鎖 */
export function isUnlocked(id: string, completed: string[], startLevel: LevelId) {
  const ref = lessonRef(id);
  if (!ref) return false;
  if (levelIndex(ref.level.id) <= levelIndex(startLevel)) return true;
  if (ref.index === 0) return true;
  return completed.includes(allLessons[ref.index - 1].lesson.id);
}

/** 下一堂要上的課 */
export function nextLesson(completed: string[], startLevel: LevelId): LessonRef {
  const start = allLessons.findIndex(r => r.level.id === startLevel);
  const fromStart = allLessons.slice(start).find(r => !completed.includes(r.lesson.id));
  return fromStart ?? allLessons.find(r => !completed.includes(r.lesson.id)) ?? allLessons[allLessons.length - 1];
}

export function levelProgress(levelId: LevelId, completed: string[]) {
  const ls = allLessons.filter(r => r.level.id === levelId);
  const done = ls.filter(r => completed.includes(r.lesson.id)).length;
  return { done, total: ls.length };
}
