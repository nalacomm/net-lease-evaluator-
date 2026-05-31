# Net Lease Deal Evaluator

Private internal tool for Blake-Dickson Commercial Real Estate. Evaluates,
scores, tracks, and reports on net lease investment properties against
per-investor buy boxes, with AI-assisted intake and scoring.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind (mobile-first) · Prisma 6 ·
Neon Postgres · NextAuth (single user) · Anthropic Claude · Recharts.

## Setup
1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` — Neon Postgres (Vercel-provisioned).
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`.
   - `ANTHROPIC_API_KEY` — for intake parsing (scoring math works without it).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Ed's login.
2. `npm install`
3. `npm run db:push` — create tables.
4. `npm run db:seed` — admin user + Mark Coleman + buy box.
5. `npm run dev` — http://localhost:3000

## Scripts
- `npm run dev` / `build` / `start`
- `npm run db:push` / `db:seed` / `db:studio`
- `npx tsx scripts/test-scoring.ts` — scoring sanity check on Mark's deals.

## Scoring
0–100 across cap rate, DSCR, lease type, term, bumps, guaranty, price,
demographics, plus an asset-type bonus. Grades: A 85+, B 70+, C 55+, D 40+,
F below 40. DSCR and cap rate are recalculated from raw inputs in a
self-checker pass. See `lib/scoring.ts`.
