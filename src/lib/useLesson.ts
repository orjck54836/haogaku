import { useEffect, useState } from 'react';
import { lessonRef } from '../content/curriculum';
import { Lesson } from '../content/types';
import { aiLesson, bundledLesson } from './ai';
import { useData } from '../state/data';

/** 取得一堂課的完整內容（內建課程立即回傳；沒有內建的主題課才向雲端要） */
export function useLesson(lessonId: string) {
  const d = useData();
  const ref = lessonRef(lessonId)!;
  const [lesson, setLesson] = useState<Lesson | null>(() => {
    if (ref.lesson.kind !== 'gen') return ref.lesson;
    const steps = bundledLesson(ref.topic!.id, ref.lesson.genKind!, d.profile.startLevel);
    return steps ? { ...ref.lesson, steps } : null;
  });
  const [error, setError] = useState('');

  async function reload() {
    setError('');
    try {
      const steps = await aiLesson(ref.topic!, ref.lesson.genKind!, d.profile.startLevel);
      setLesson({ ...ref.lesson, steps });
    } catch (e: any) { setError(e?.message ?? '載入失敗'); }
  }
  useEffect(() => { if (!lesson) reload(); }, []);

  return { ref, lesson, error, reload };
}
