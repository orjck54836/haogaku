import { useEffect, useState } from 'react';
import { lessonRef } from '../content/curriculum';
import { Lesson } from '../content/types';
import { aiLesson, bundledLesson } from './ai';
import { useData } from '../state/data';

/** 取得一堂課的完整內容（內建課程立即回傳；沒有內建的主題課才向雲端要） */
export function useLesson(lessonId: string) {
  const d = useData();
  const ref = lessonRef(lessonId)!;
  const level = d.profile.startLevel;
  const [lesson, setLesson] = useState<Lesson | null>(() => {
    if (ref.lesson.kind !== 'gen') return ref.lesson;
    // 手寫版只有初級那一階，進階一律用產生的，否則兩階會看到一樣的句子
    if (level === 'L2' && ref.lesson.basicSteps?.length) return { ...ref.lesson, steps: ref.lesson.basicSteps };
    const steps = bundledLesson(ref.topic!.id, ref.lesson.genKind!, level);
    return steps ? { ...ref.lesson, steps } : null;
  });
  const [error, setError] = useState('');

  async function reload() {
    setError('');
    try {
      const steps = await aiLesson(ref.topic!, ref.lesson.genKind!, level);
      setLesson({ ...ref.lesson, steps });
    } catch (e: any) { setError(e?.message ?? '載入失敗'); }
  }
  useEffect(() => { if (!lesson) reload(); }, []);

  return { ref, lesson, error, reload };
}
