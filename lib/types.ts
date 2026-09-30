export type AxisId =
  | 'economy'
  | 'federalism'
  | 'religion'
  | 'identity'
  | 'power'
  | 'security'
  | 'social'
  | 'democracy'
  | 'global'
  | 'corruption';

export const AXIS_IDS: AxisId[] = [
  'economy',
  'federalism',
  'religion',
  'identity',
  'power',
  'security',
  'social',
  'democracy',
  'global',
  'corruption',
];

export type AxisScores = Record<AxisId, number>;
export type PartialAxes = Partial<Record<AxisId, number | null>>;
export type Weights = Partial<Record<AxisId, number>>;

export interface Statement {
  id: string;
  text: string;
  direction: 1 | -1;
}

export interface Axis {
  id: AxisId;
  name: string;
  poleA: string;
  poleB: string;
  statements: Statement[];
}

export interface CanonicalStatement extends Statement {
  axis: AxisId;
}

export interface ScenarioOption {
  label: string;
  effects: Partial<Record<AxisId, number>>;
}

export interface Scenario {
  id: string;
  prompt: string;
  options: ScenarioOption[];
}

export interface HistoryQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface DemographicQuestion {
  id: string;
  label: string;
  options: string[];
  optional: boolean;
}

export interface Persona {
  name: string;
  roast: string;
}

export interface Family {
  id: string;
  name: string;
  persona: Persona;
  description: string;
  axes: AxisScores;
}

export interface Profile {
  id: string;
  name: string;
  /** Short display name used on share cards. */
  short?: string;
  status: 'living' | 'deceased';
  category: string;
  tags: string[];
  summary: string;
  axes: PartialAxes;
  notes: string;
  evidence_level: 'sourced' | 'background_unverified';
  confidence: string;
  sources: string[];
}
