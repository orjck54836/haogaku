export type LevelId = 'L1' | 'L2' | 'L3' | 'L4';

export type Option = { text: string; sub?: string; hint?: string };

/** 教學卡：先學再考 */
export type LearnStep = {
  type: 'learn';
  ja: string;
  reading?: string;
  zh: string;
  note?: string;
};

/** 選擇題 */
export type ChoiceStep = {
  type: 'choice';
  label: string;
  line: string;
  lineZh?: string;
  speak?: string;
  question: string;
  options: Option[];
  answer: number;
  explain: string;
};

export type Step = LearnStep | ChoiceStep;

export type LessonKind = 'kana' | 'vocab' | 'scene' | 'ai';

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  kind: LessonKind;
  minutes: number;
  steps: Step[];           // AI 課程為空陣列
  scenarioId?: string;     // AI 課程對應的會話情境
};

export type Unit = { id: string; title: string; description: string; lessons: Lesson[]; hasKanaChart?: boolean };

export type Level = {
  id: LevelId;
  title: string;
  jlpt: string;
  description: string;
  units: Unit[];
};

export type Scenario = {
  id: string;
  level: LevelId;
  category: '旅行' | '生活' | '職場' | '自由';
  title: string;
  icon: string;          // Ionicons 名稱
  role: string;          // AI 扮演的角色
  setting: string;       // 情境說明
  goal: string;          // 學習者的任務
  opening: string;       // AI 的開場白（日文）
  openingZh: string;
};

export type Slang = {
  word: string; reading: string; meaning: string;
  example: string; exampleZh: string; when: string;
};
