# Session Notes — Net Lease Deal Evaluator
Last updated: 2026-06-01

## Quick Reference
- Repo: github.com/nalacomm/net-lease-evaluator- (trailing dash)
- Local: ~/net-lease-evaluator
- Vercel project: net-lease-evaluator (gmgworldmedia team)
- DB: Neon, ep-young-surf-aqdpzdkb, database=neondb
- Login: ed@blakedickson.com / changeme123
- Anthropic model in use: claude-sonnet-4-20250514

## All Modules Built
1. Auth (NextAuth credentials, JWT, middleware)
2. Navigation (sidebar desktop, bottom tabs mobile)
3. Investors: list, profile, create (manual + AI wizard from narrative/docs), edit
4. Deals: global pool (investorId nullable), text/PDF/URL intake, AI extraction,
   self-checker, scoring, deal profile 4-tab, export page, investor assignment checkboxes
5. Scoring: 0-100pts across 8 categories + asset type bonus. Grades A/B/C/D/F.
   Validated against Mark Coleman's Owings Mills (83/B) and Newington (80/B).
6. Finance: LTV slider, break-even LTV/rate, sensitivity, Export/Print button.
   Finance page accepts ?investorId= for investor-specific buy box.
7. Dashboard: investor switcher, stats, asset class chart, news flags.
   Portfolio income stats removed per user request.
8. Reports: investor selector tabs, top-3 deal picker (primary + assigned deals),
   AI exec summary / risks / strengths / recommendation, print to PDF.
9. News: manual entry, AI deal tagging on submission.
10. Deal Export: /deals/[id]/export — print-ready per-investor report.

## Schema Changes from Original Spec
- Deal.investorId nullable (global deal pool)
- DealAssignment table added (dealId + investorId, per-investor score/grade/breakdown)
- Deal fields added: numberOfTenants, anchorTenant, vacancyRate, grossLeasableArea
- Asset types: dollar_store removed, shopping_center added
- BuyBox.currentMonthlyIncome: kept in DB, removed from all UI

## Stub Pages (not yet built)
- /comps — comp tracker
- /deals/compare — side-by-side comparison

## Open Issues
- NEXTAUTH_URL in Vercel must match actual deployed domain exactly
- Shopping center asset type not yet weighted differently in scoring engine

## Previous Session Summary

## What was worked on
Scaffolded a brand-new Next.js 14 app, `net-lease-evaluator`, at
`/Users/edwardhenderson/net-lease-evaluator`. Built the foundation through the
first milestone checkpoint.

## Key decisions
- The existing `blake-dickson-crm` repo holds a DIFFERENT, active CRM
  (contacts, follow-ups, properties). We did NOT touch it. The evaluator is a
  separate project + separate repo (`net-lease-evaluator`).
- Database: separate Neon database to keep it fully isolated from the CRM.
  Decided to provision via Vercel (Storage → Neon Postgres) because the Neon
  org is Vercel-managed and the standalone "New project" button is locked.
- Pacing: checkpoint at milestones. Foundation built first, then pause.

## What is built and verified
- Next.js 14 App Router + TypeScript + Tailwind (mobile-first) + Prisma 6 +
  NextAuth (credentials, single user Ed).
- Full Prisma schema (Investor, BuyBox, Deal, DealUpdate, NewsItem,
  DealNewsFlag, Report, Comp, User).
- Seed: admin user from ADMIN_EMAIL/PASSWORD + Mark Coleman + his buy box.
- Scoring engine (lib/scoring.ts) — validated against Mark's two closed deals:
  Owings Mills 83/B, Newington 80/B, DSCR ~1.35x at 65% LTV, break-even LTV ~65%.
- Finance engine (lib/finance.ts): payment, DSCR, break-even LTV, break-even rate.
- AI intake (text/PDF/URL) via Anthropic claude-sonnet-4-20250514, JSON extraction.
- Pages: dashboard, deals list (sort/filter), deal intake, deal profile (4 tabs:
  overview/financials/updates/news), deal edit, finance module (LTV + rate
  sliders, break-even markers), investors list/profile (with portfolio cash
  flow), investor new + buy box form, settings.
- Nav: desktop sidebar + mobile bottom tabs, 6 sections, 44px touch targets.
- `npm run build` passes clean (19 routes, types OK).

## Stubbed (next phase)
News feed + AI tagging, reports PDF export, comp tracker, deal comparison mode,
buy box wizard, broker/source log, asset-class chart already on dashboard.

## Open tasks / where we left off
1. USER: create empty GitHub repo `nalacomm/net-lease-evaluator` (no README).
2. USER: import repo to Vercel, add Neon Postgres storage, copy DATABASE_URL
   (and DIRECT_URL if shown) back.
3. THEN: push code, set real .env, run `npm run db:push` + `npm run db:seed`,
   `npm run dev`, smoke test login + dashboard + add a deal.
4. Then continue build sequence: news, reports, comps, compare, buybox wizard.

## Local commands
- Dev: `npm run dev`
- Migrate schema to DB: `npm run db:push`
- Seed: `npm run db:seed`
- Build: `npm run build`
- Test scoring: `npx tsx scripts/test-scoring.ts`

## Env needed (.env)
DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ANTHROPIC_API_KEY,
ADMIN_EMAIL, ADMIN_PASSWORD. Placeholders are in `.env`; replace DB + API key.
