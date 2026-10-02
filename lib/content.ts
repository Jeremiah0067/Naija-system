import quizJson from '../content/quiz-content.json';
import scenariosJson from '../content/scenarios.json';
import familiesJson from '../content/families.json';
import profilesJson from '../content/profiles.json';
import type {
  Axis,
  CanonicalStatement,
  DemographicQuestion,
  Family,
  HistoryQuestion,
  Persona,
  Profile,
  Scenario,
} from './types';

export const AXES = quizJson.axes as unknown as Axis[];
export const DEMOGRAPHICS = quizJson.demographics as unknown as DemographicQuestion[];
export const HISTORY = quizJson.history.questions as unknown as HistoryQuestion[];
export const SCENARIOS = scenariosJson.scenarios as unknown as Scenario[];
export const FAMILIES = familiesJson.families as unknown as Family[];
export const CENTRIST = familiesJson.centrist_persona as unknown as Persona & { description: string };
export const PROFILES = profilesJson.profiles as unknown as Profile[];

/** Fixed order used for encoding answers. Never reorder without bumping the code version. */
export const STATEMENTS: CanonicalStatement[] = AXES.flatMap((axis) =>
  axis.statements.map((s) => ({ ...s, axis: axis.id })),
);

export const AXIS_BY_ID = Object.fromEntries(AXES.map((a) => [a.id, a])) as Record<string, Axis>;

/**
 * Living people are hidden from matching until the legal review in the blueprint is done.
 * Set NEXT_PUBLIC_SHOW_LIVING_FIGURES=true to include them.
 */
export const SHOW_LIVING = process.env.NEXT_PUBLIC_SHOW_LIVING_FIGURES === 'true';

/**
 * Profiles rated 'low' confidence in the research file are held back from matching until
 * independent reviewers have scored them, because a contested score shown to thousands of
 * people does more harm than good.
 */
export const MATCHABLE_PROFILES = PROFILES.filter(
  (p) => (SHOW_LIVING || p.status === 'deceased') && p.confidence.trim() !== 'low',
);
