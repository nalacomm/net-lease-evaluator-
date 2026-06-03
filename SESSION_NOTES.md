# Net Lease Deal Evaluator — Session Notes
Last updated: 2026-06-02

---

## Quick Reference
- Repo: github.com/nalacomm/net-lease-evaluator- (trailing dash in name)
- Local: ~/net-lease-evaluator
- Vercel project: net-lease-evaluator (gmgworldmedia team)
- Custom domain: netleaseevaluator.com (purchased via Cloudflare — DNS setup in progress)
- DB: Neon pooled ep-young-surf-aqdpzdkb-pooler, database=neondb
- DIRECT_URL: ep-young-surf-aqdpzdkb (non-pooler, for Prisma migrations)
- Login: ed@blakedickson.com / (password set in Vercel ADMIN_PASSWORD env var)
- Password sync endpoint: GET /api/admin/sync-password (call once after changing ADMIN_PASSWORD in Vercel)
- Anthropic model: claude-sonnet-4-20250514
- Separate from existing blake-dickson-crm repo — do NOT touch that

---

## Environment Variables (all set in Vercel + local .env)
- DATABASE_URL — Neon pooled
- DIRECT_URL — Neon direct (non-pooler)
- NEXTAUTH_SECRET
- NEXTAUTH_URL — must match deployed domain exactly (update when custom domain live)
- ANTHROPIC_API_KEY
- ADMIN_EMAIL=ed@blakedickson.com
- ADMIN_PASSWORD — set in Vercel; run /api/admin/sync-password after changing

---

## Seeded Data
- Investor: Mark Coleman / Octopus Island LLC
- Buy box: 6.75% cap floor, 7.0% target, $7M max ($7.5M stretch), absolute NNN preferred,
  10yr min / 15yr preferred, 2% bumps or 10% every 5yr, corporate guaranty preferred,
  12+ unit franchisee acceptable, 1.35x DSCR min, 65% LTV, 7% rate, 25yr amort,
  ECLC preferred, QSR/pharmacy/medical/retail/shopping_center acceptable
- Admin user: ed@blakedickson.com (bcrypt hash of ADMIN_PASSWORD)

---

## Current Prisma Schema (post all migrations)
Key additions/changes vs original spec:
- Deal.investorId: nullable (global deal pool — deals can exist without an investor)
- DealAssignment: dealId + investorId + score + grade + scoreBreakdown + gapAnalysis (Json?)
  Unique constraint: [dealId, investorId]
- Deal fields added: numberOfTenants, anchorTenant, vacancyRate, grossLeasableArea (shopping center)
- Asset types: dollar_store REMOVED, shopping_center ADDED
- BuyBox.currentMonthlyIncome: kept in DB but removed from all UI
- User model for single-admin auth (not using NextAuth adapter — custom bcrypt)

---

## All Modules Built

### Auth
- NextAuth credentials provider, JWT sessions
- Single user (Ed), bcrypt password stored in User table
- Middleware protects all routes except /login and /api/auth
- Password sync: GET /api/admin/sync-password re-hashes ADMIN_PASSWORD env var

### Navigation
- Sidebar (desktop, always visible), bottom tab bar (mobile, fixed)
- 6 sections: Dashboard, Deals, Investors, News, Reports, Settings
- Both nav elements: print:!hidden (don't appear in exports)

### Investors
- List, profile, create (manual OR AI wizard), edit (/investors/[id]/edit)
- AI Buy Box Wizard: paste narrative + upload PDFs → Claude extracts buy box → user reviews
- Per-investor deal view: investor profile shows all assigned deals with Finance + Overview links
- All links carry ?investorId= — all modules use that investor's buy box when accessed from investor context
- PATCH /api/investors/[id] auto re-analyzes all deals after buy box change (up to 30)

### Deals — Global Pool
- investorId nullable — deals exist independently, assigned to investors via DealAssignment
- Intake: text / PDF / URL with AI extraction, self-checker, confidence level
- Deal profile: 4 tabs (Overview, Financials, Updates, News Flags)
- Investor assignment checkboxes: score same deal against multiple investors simultaneously
- Each assignment stores investor-specific score, grade, scoreBreakdown, gapAnalysis
- Delete deal: Trash button with confirm dialog
- Export: /deals/[id]/export — all fields, finance snapshot, score breakdown, gap analysis (server-side), print footer

### Scoring Engine (lib/scoring.ts)
- 0–100 pts: Cap Rate (20), DSCR (20), Lease Type (15), Term (15), Bumps (10),
  Guaranty (10), Price vs Ceiling (5), Demographics (5), Asset Type bonus (+5)
- Grades: A≥85, B≥70, C≥55, D≥40, F<40
- Math audit: 32/32 checks passed (scripts/math-audit.ts)
- Validated: Owings Mills 83/B, Newington 80/B

### Finance Module (lib/finance.ts)
- computeFinance: amortizing payment, DSCR, cap rate, cash-on-cash, equity
- breakEvenLtv, breakEvenRate (bisection)
- FinancePlanner: LTV slider (0–90%, step 5%), rate/amort inputs, break-even markers,
  rate sensitivity slider (5–10%), Export/Print button with Ed Henderson footer
- Finance page: accepts ?investorId= → uses that investor's buy box

### Gap Analysis (lib/gap-analysis.ts)
- AI evaluates below-threshold deals for exceptional qualities
- Generates buy-box adjustment table (field / current value / required value / impact)
- "Worth a look" amber flag for exceptional deals
- Results PERSISTED to DealAssignment.gapAnalysis — loads instantly on revisit
- Refresh button to re-run; investorId passed so result saves to correct assignment
- Also runs server-side on deal export page

### Dashboard
- Investor switcher dropdown (?investor= URL param)
- Shows PRIMARY deals + ASSIGNED deals (via DealAssignment) for selected investor
- Uses investor-specific scores for assigned deals
- Stats: active deals, scored deals, top deal grade/score
- Asset class bar chart (avg score per type, investor-scoped)
- Recent news flags (scoped to investor's deal IDs)

### Reports
- Investor selector tabs at top (/reports?investorId=)
- Deal picker: shows primary + assigned deals for selected investor, ranked by score
- AI generates: exec summary, per-deal strengths/risks, recommendation
- ALL prompts are CLIENT-FACING — "you/your" language, speaks directly to investor
- Only includes deals belonging to the selected investor (no cross-investor bleed)
- Uses investor-specific scores from DealAssignment
- Print to PDF via window.print(); Ed Henderson footer on every printed page
- Past reports history per investor

### News
- Manual entry + URL paste
- AI tags active deals on submission (positive/negative/neutral/watch)
- Deal-level news flags on deal profile News tab

### Exports & Print
- Print footer: "Ed Henderson · Blake-Dickson Real Estate" + date
- Fixed via CSS-only approach: .print-footer { display: none } screen,
  @media print { display: flex !important } — no Tailwind class conflicts
- Sidebar + bottom tabs: print:!hidden on both nav components
- Covers: deal export, finance planner, report generator

---

## PDF Intake Fix (important)
- Root cause: serverComponentsExternalPackages was under `experimental` (Next.js 13 syntax)
- Fixed in next.config.mjs: moved to top-level `serverExternalPackages`
- Import changed to `require("pdf-parse/lib/pdf-parse.js")` — bypasses index.js test-file loading
- Pre-validates buffer starts with %PDF, strips BOM/leading bytes
- File size check: rejects >10MB with clear message
- All AI errors (credits exhausted, rate limit, invalid key) surface as human-readable messages via lib/ai-error.ts

---

## Stub Pages (not yet built)
- /comps — comp tracker (page exists, shows empty state)
- /deals/compare — side-by-side comparison (page exists, shows empty state)

---

## Open / In-Progress
- Custom domain netleaseevaluator.com: purchased via Cloudflare, being connected to Vercel
  - Vercel: add domain in Settings → Domains
  - Cloudflare: A record @ → 76.76.21.21, CNAME www → cname.vercel-dns.com (gray cloud, DNS only)
  - After DNS live: update NEXTAUTH_URL in Vercel to https://netleaseevaluator.com

---

## Local Commands
```
npm run dev              # start dev server
npm run build            # production build check
npm run db:push          # push schema changes to Neon
npm run db:seed          # seed admin user + Mark Coleman
npx tsx scripts/math-audit.ts    # run math verification (32/32)
```

---

## Key Architectural Decisions
- Global deal pool: deals not locked to one investor; DealAssignment stores per-investor scoring
- No PDF bundle: pdf-parse must stay in serverExternalPackages or it breaks on Vercel
- Finance engine is pure math (no AI) — instant recalculation, audited
- Reports speak directly to investor (you/your) — not about the investor in third person
- Gap analysis cached in DB — runs once per investor per deal, loads from DB on revisit
