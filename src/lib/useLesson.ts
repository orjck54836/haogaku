import { useEffect, useState } from 'react';
import { lessonRef } from '../content/curriculum';
import { Lesson } from '../content/types';
import { aiLesson, bundledLesson } from './ai';
import { useData } from '../state/data';
import { stripFurigana } from './furigana';

/**
 * 把課文裡的括號注音清掉（只清日文句子那幾個欄位）。
 *
 * 清在這裡是因為兩個畫面（LessonScreen／LessonContentScreen）和三種來源
 * （手寫的 basicSteps、打包好的 lessons.json、雲端現場產生的）都走這支 hook，
 * 只有這裡一次清得完。
 *
 * **中文說明（note／explain／hint／sub）不清**：那裡的括號是在補日文詞的原形，
 * 例如「切(きる)先,炒(いためる)後」，清掉會變成「切先,炒後」。
 */
const JA_FIELDS = ['ja', 'reading', 'line', 'speak', 'text', 'question'] as const;

function cleanSteps<T>(steps: T[]): T[] {
  return steps.map(step => {
    const s: any = { ...step };
    for (const f of JA_FIELDS) if (typeof s[f] === 'string') s[f] = stripFurigana(s[f]);
    if (Array.isArray(s.options)) {
      s.options = s.options.map((o: any) =>
        typeof o?.text === 'string' ? { ...o, text: stripFurigana(o.text) } : o);
    }
    return s as T;
  });
}

/** 取得一堂課的完整內容（內建課程立即回傳；沒有內建的主題課才向雲端要） */
export function useLesson(lessonId: string) {
  const d = useData();
  const ref = lessonRef(lessonId)!;
  const level = d.profile.startLevel;
  const [lesson, setLesson] = useState<Lesson | null>(() => {
    if (ref.lesson.kind !== 'gen') return { ...ref.lesson, steps: cleanSteps(ref.lesson.steps) };
    // 手寫版只有初級那一階，進階一律用產生的，否則兩階會看到一樣的句子
    if (level === 'L2' && ref.lesson.basicSteps?.length) return { ...ref.lesson, steps: cleanSteps(ref.lesson.basicSteps) };
    const steps = bundledLesson(ref.topic!.id, ref.lesson.genKind!, level);
    return steps ? { ...ref.lesson, steps: cleanSteps(steps) } : null;
  });
  const [error, setError] = useState('');

  async function reload() {
    setError('');
    try {
      const steps = await aiLesson(ref.topic!, ref.lesson.genKind!, level);
      setLesson({ ...ref.lesson, steps: cleanSteps(steps) });
    } catch (e: any) { setError(e?.message ?? '載入失敗'); }
  }
  useEffect(() => { if (!lesson) reload(); }, []);

  return { ref, lesson, error, reload };
}
