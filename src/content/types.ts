/**
 * 日語程度，只有兩階。
 *
 * 原本是 L1〜L4，但實際上只有兩份內容（lessons.json 的 L2／L3），
 * L1 降級抓 L2、L4 降級抓 L3，於是四格頁籤裡有兩組畫面完全一樣，
 * 使用者切了看不出差別。id 沿用 L2／L3 不改名——改了的話
 * lessons.json 的 249×2 筆 key、Cloud Functions 和已存的使用者資料全要跟著動。
 */
export type LevelId = 'L2' | 'L3';

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
  /**
   * 手寫版的內容，只給初級用（見 curriculum.ts 的 handwritten）。
   * 不直接放進 steps：那樣會讓這堂課在兩階都長一樣，
   * 切到進階的人看到的還是 N5 的句子。
   */
  basicSteps?: Step[];
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
