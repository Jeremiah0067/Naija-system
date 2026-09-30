# Naija Axes (MVP)

A Nigerian political-orientation quiz: 60 statements and 8 scenarios across 10 axes, a 20-question history round,
persona and ideological-family matching, matching to historical figures, a contradiction detector, share cards
and friend comparison. No login, no database required.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 14 unit tests for scoring, encoding, matching, contradictions, history
npm run typecheck
npm run build && npm start
```

## How it works

- **Stateless results.** Answers are packed into digits in the URL (`/results?a=<68 digits>&h=<20 digits>&p=<priorities>`).
  Nothing is stored to view or share a result. `lib/encode.ts` defines the format. Never reorder statements or scenarios
  in the content files without changing the code version, or old links will change meaning.
- **Scoring** (`lib/scoring.ts`): value = (answer - 3) x direction. Scenario options add -2 to +2 to named axes.
  Axis score = mean x 50, from -100 to +100.
- **Matching** (`lib/matching.ts`): weighted mean absolute gap, skipping axes a profile has no evidence for.
  Priority axes count double. Thinly-evidenced profiles are pushed down, and 'Very close' needs at least 3 axes of evidence.
- **Safety gates** (`lib/content.ts`): living people are hidden unless `NEXT_PUBLIC_SHOW_LIVING_FIGURES=true`, and profiles
  marked `confidence: "low"` are held back from matching.
- **Result card**: `/api/card` renders a 1080x1920 story-format image (persona, ten axes, best match, other
  personalities, nearby families). The results page shows it and offers an HD download. `/api/og` renders the
  1200x630 link preview. Card fonts (Poppins) are fetched at runtime from GitHub; if that fails the card falls back
  to a default font.
- **Opt-in stats**: `/api/submit` stores a response only if the taker ticks the consent box AND the Supabase env vars are set.
  Run `supabase/schema.sql` first. The zone view only exposes groups of 30 or more.

## Content (edit these, not the code)

| File | What it holds |
|---|---|
| `content/quiz-content.json` | demographics, 10 axes, 60 statements, 20 history questions |
| `content/scenarios.json` | 8 scenario questions and their axis effects |
| `content/families.json` | 10 ideological families, persona names and roasts (DRAFT vectors) |
| `content/profiles.json` | historical figure profiles, parties to code, research queue |

## Before a public launch

1. Have 10 to 15 diverse reviewers read all statements for neutrality; fix loaded wording.
2. Verify every unsourced profile score with two or three independent researchers and real sources.
3. Get a Nigerian lawyer to review profile pages and the privacy notice (political opinion is sensitive data under the NDPA).
4. Run a 200 to 300 person pilot and check statement reliability (Cronbach's alpha per axis) and test-retest stability.
5. Confirm the campaign-period plan: launch without party matching first.
6. Set `NEXT_PUBLIC_SITE_URL`, deploy to Vercel, and check the share card in WhatsApp.

## Not built yet

Pidgin, Hausa, Yoruba and Igbo translations; party matching; Rule Nigeria for 100 Days; Pick Your Cabinet; the history game
show mode; group mode and zone/age comparison pages; admin dashboard for item statistics.
