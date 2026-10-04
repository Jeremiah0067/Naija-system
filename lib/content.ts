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
const AXIS_WORDS = ['economy', 'federalism', 'religion', 'identity', 'power', 'security', 'social', 'democracy', 'global', 'corruption'] as const;

/**
 * Some research exports mark axes with no evidence as 0 and list them in the notes after the words
 * "ZERO-PLACEHOLDER". A real 0 means "balanced" and would be counted in matching, which pulls everyone
 * toward the centre and inflates how many axes a person is compared on. So placeholder axes become null.
 */
export function nullPlaceholderAxes(profile: Profile): Profile {
  const notes = profile.notes ?? '';
  const marker = 'ZERO-PLACEHOLDER';
  const axes = { ...profile.axes };
  let from = notes.indexOf(marker);
  while (from !== -1) {
    // Read the list that follows, ignoring anything inside brackets, until a full stop outside them.
    let depth = 0;
    let outside = '';
    for (let i = from + marker.length; i < notes.length; i++) {
      const ch = notes[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (depth === 0 && ch === '.' && (i + 1 >= notes.length || notes[i + 1] === ' ')) break;
      else if (depth === 0) outside += ch;
    }
    for (const axis of AXIS_WORDS) {
      if (new RegExp(`\\b${axis}\\b`, 'i').test(outside) && axes[axis] === 0) axes[axis] = null;
    }
    from = notes.indexOf(marker, from + marker.length);
  }
  return { ...profile, axes };
}

export const PROFILES = (profilesJson.profiles as unknown as Profile[]).map(nullPlaceholderAxes);

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
