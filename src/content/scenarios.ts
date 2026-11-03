import { Scenario } from './types';
import { topics, categories, Topic } from './topics';

export function scenarioFromTopic(t: Topic): Scenario {
  return {
    id: `t-${t.id}`,
    level: t.minLevel ?? 'L2',
    category: categories.find(c => c.id === t.cat)?.title ?? '',
    title: t.title,
    icon: t.icon,
    role: t.role,
    setting: t.setting,
    goal: t.goal,
    opening: t.opening,
    openingZh: t.openingZh,
    voice: t.voice,
  };
}

export const scenarios: Scenario[] = topics.map(scenarioFromTopic);
export const scenarioById = (id: string) => scenarios.find(s => s.id === id);
