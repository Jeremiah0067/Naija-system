import { HISTORY, SCENARIOS, STATEMENTS } from './content';

/**
 * Results are stateless: answers are packed into digit strings in the URL, so no account
 * or database is needed to view or share a result.
 *
 * a = one digit per statement (1-5, 0 = unanswered) followed by one digit per scenario
 *     (option index + 1, 0 = unanswered)
 * h = one digit per history question (option index 0-3, 9 = unanswered)
 */
export function encodeAnswers(statements: number[], scenarios: number[]): string {
  return [...statements, ...scenarios].map((n) => String(n)).join('');
}

export function decodeAnswers(code: string | undefined | null) {
  const ns = STATEMENTS.length;
  const nc = SCENARIOS.length;
  if (!code || code.length !== ns + nc || !/^\d+$/.test(code)) return null;
  const digits = code.split('').map(Number);
  const statements = digits.slice(0, ns);
  const scenarios = digits.slice(ns);
  if (statements.some((d) => d > 5)) return null;
  for (let i = 0; i < nc; i++) {
    if (scenarios[i] > SCENARIOS[i].options.length) return null;
  }
  return { statements, scenarios };
}

export function encodeHistory(answers: number[]): string {
  return answers.map((n) => (n < 0 ? '9' : String(n))).join('');
}

export function decodeHistory(code: string | undefined | null): number[] | null {
  if (!code || code.length !== HISTORY.length || !/^\d+$/.test(code)) return null;
  return code.split('').map((c) => (c === '9' ? -1 : Number(c)));
}
