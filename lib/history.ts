import { HISTORY } from './content';

const RANKS = [
  { min: 19, title: 'Professor Emeritus', blurb: 'The department calls you when nobody remembers the date.' },
  { min: 15, title: 'Senior Lecturer', blurb: 'Strong grasp of the timeline. A few footnotes to chase.' },
  { min: 10, title: 'Final-Year Student', blurb: 'You know the big events. Time to firm up the details.' },
  { min: 5, title: 'NYSC Corps Member', blurb: 'A solid start. Keep going.' },
  { min: 0, title: 'JAMB Candidate', blurb: 'The syllabus is long, and the good news is it is very interesting.' },
];

export function scoreHistory(answers: number[]) {
  let correct = 0;
  let asked = 0;
  HISTORY.forEach((q, i) => {
    if (answers[i] === undefined || answers[i] < 0) return; // not asked in this draw
    asked += 1;
    if (answers[i] === q.answer) correct += 1;
  });
  const rank = RANKS.find((r) => correct >= r.min) ?? RANKS[RANKS.length - 1];
  return { correct, total: asked, rank };
}
