import { STATEMENTS } from './content';

interface Rule {
  id: string;
  a: string; // statement id
  b: string; // statement id
  message: string;
}

/** "Agree" means answering 4 or 5. Both statements must be agreed with to trigger a rule. */
const RULES: Rule[] = [
  { id: 'police', a: 'fed2', b: 'fed3', message: 'You backed one national police force and also state police. Pick a lane, or draw us the map.' },
  { id: 'ownership', a: 'eco2', b: 'eco3', message: 'You want government to keep key industries and to privatise the ones that fail. Which ones stay?' },
  { id: 'prices', a: 'eco3', b: 'eco4', message: 'You want more privatisation and also price controls. Markets and price caps rarely share a bench.' },
  { id: 'indigenes', a: 'ide3', b: 'ide6', message: 'You want states to favour indigenes and every Nigerian treated the same everywhere. Both cannot win at once.' },
  { id: 'rotation', a: 'pow1', b: 'pow6', message: 'You want the presidency to rotate and merit alone to decide, even if one region dominates. One of these has to give.' },
  { id: 'force', a: 'sec1', b: 'sec2', message: 'You want armed groups defeated before talks, and you think amnesty works. What comes first?' },
  { id: 'imports', a: 'glo1', b: 'glo2', message: 'You want imports restricted and foreign investment welcomed with few limits. Which door are you closing?' },
  { id: 'leader', a: 'dem1', b: 'dem5', message: 'You want a strong leader and an electoral commission that the leader cannot touch. Interesting combination.' },
];

export function findContradictions(statementAnswers: number[], max = 3): string[] {
  const byId = new Map(STATEMENTS.map((s, i) => [s.id, statementAnswers[i] ?? 0]));
  const hits: string[] = [];
  for (const rule of RULES) {
    if ((byId.get(rule.a) ?? 0) >= 4 && (byId.get(rule.b) ?? 0) >= 4) hits.push(rule.message);
    if (hits.length >= max) break;
  }
  return hits;
}
