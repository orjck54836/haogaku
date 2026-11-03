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

export type GenKind = 'basic' | 'native' | 'practice';

export type LessonKind = 'kana' | 'vocab' | 'scene' | 'ai' | 'gen';  // gen：AI 產生的主題課

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  kind: LessonKind;
  minutes: number;
  steps: Step[];           // AI 課程為空陣列
  scenarioId?: string;     // AI 課程對應的會話情境
  topicId?: string;
  genKind?: GenKind;
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
  category: string;
  title: string;
  icon: string;          // Ionicons 名稱
  role: string;          // AI 扮演的角色
  setting: string;       // 情境說明
  goal: string;          // 學習者的任務
  opening?: string;      // AI 的開場白（日文），沒有的話由 AI 開場
  openingZh?: string;
  voice?: 'female' | 'male';   // AI 角色的聲音，預設女聲
};

export type Slang = {
  word: string;
  /** 平假名讀音。只有含漢字的詞才有——假名詞的詞形本身就是讀音 */
  kana?: string;
  reading: string; meaning: string;
  example: string; exampleZh: string; when: string;
};
