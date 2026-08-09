# Better Debt

A debt payoff planner — and, now, a debt *decision* tool. Track your debts,
compare avalanche vs. snowball payoff strategies, and see real numbers
instead of folklore: flat-rate loans normalized to their true APR, the actual
cost of losing a credit card's grace period, what a lump-sum prepayment is
actually worth, whether a balance transfer is worth its fee, and — before you
sign anything new — what a loan offer *really* costs and whether you can
actually afford it.

## Features

**Manage debt you already have**
- Debt CRUD with support for both reducing-balance and flat-rate loans.
- Avalanche vs. snowball payoff planning across all your debts at once, with
  a balance-over-time chart and a month-by-month payment table.
- A dashboard hero card that auto-runs the payoff plan on your saved debts —
  projected debt-free date, which debt to attack first, and how much
  avalanche saves over snowball — plus color-coded stat tiles, no manual
  re-entry required.
- Single-debt payoff projection, flat-rate → true-APR normalization,
  credit-card grace-period cost, prepayment impact (reduce tenure vs. reduce
  EMI), and balance-transfer break-even (fee vs. teaser-rate savings).

**Evaluate a loan before you take it**
- **Loan offer check**: upload a loan/EMI/BNPL/credit-card offer PDF. A free,
  offline, regex-based extractor reads the terms off the page (principal,
  tenure, rate type, fees, teaser/reversion rates) — no AI API, no cost, no
  external dependency. You review and correct whatever it couldn't find,
  then it computes the offer's **true APR** (every upfront fee folded into
  one comparable rate, the same technique the balance-transfer calculator
  uses for a transfer fee), a tier (`GREAT` / `FAIR` / `HIGH_COST` /
  `PREDATORY`), and a plain-language red-flag list (flat-rate deception,
  oversized processing fees, prepayment penalties, "0% EMI" that isn't
  actually free, teaser rates that revert to something much higher).
- **Affordability check**: a second, independent verdict on the same offer —
  not "is this a good rate" but "can *you* actually handle the payment."
  Enter your income and existing monthly debt payments and it returns a
  readiness verdict (`GOOD_TIME` / `TIGHT` / `NOT_RECOMMENDED`) based on
  conventional debt-to-income guardrails, plus a personalized max-affordable-
  APR ceiling to shop against — grounded only in your own numbers, never a
  lender's product listing (so it can't go stale or be a paid placement).

## Stack

- **Backend**: TypeScript, Fastify, Prisma 7 + Postgres, Zod, decimal.js,
  `@fastify/multipart` (file upload), `pdf-parse` (PDF text extraction)
- **Frontend**: Next.js (App Router), React, Tailwind CSS, TanStack Query

## Project structure

```
backend/    Fastify API — debt CRUD, payoff calculators, loan-offer check, affordability check
frontend/better-debt-frontend/   Next.js app
```

## Running locally

### 1. Database

Requires a local Postgres instance.

```bash
createdb better_debt_dev
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL if different from the default
npx prisma migrate dev
npm run dev             # http://localhost:3001
```

No API keys are required — loan-offer extraction is regex-based, not AI-based.

### 3. Frontend

```bash
cd frontend/better-debt-frontend
npm install
npm run dev              # http://localhost:3000
```

The frontend expects the backend at `NEXT_PUBLIC_API_URL` (`.env.local`,
defaults to `http://localhost:3001`).

There's no auth yet — every request is scoped to a single hardcoded dev user
(`backend/src/lib/dev-user.ts`).

## API

All endpoints on the backend, unprefixed.

**Debts**
| Method | Path | |
|---|---|---|
| GET | `/debts` | List debts |
| GET | `/debts/:id` | Get one debt |
| POST | `/debts` | Create a debt |
| PATCH | `/debts/:id` | Update a debt |
| DELETE | `/debts/:id` | Delete a debt |

A debt has a `rateType` of `FLAT` or `REDUCING`. `FLAT` debts (common for
consumer-durable EMIs) require `principal` and `tenureMonths` so their true
APR can be worked out — see the flat-rate calculator below.

**Calculators** (all `POST`, all stateless — no saved debts required)
| Path | What it does |
|---|---|
| `/calculators/single-debt-projection` | Months and total interest to clear one debt at a fixed payment |
| `/calculators/payoff-plan` | Avalanche vs. snowball across several debts, with a shared extra budget. Auto-normalizes any `FLAT` debts before simulating |
| `/calculators/normalize-flat-rate` | Converts a flat-rate loan into its equivalent reducing-balance APR |
| `/calculators/credit-card-projection` | Isolates how much continuing to spend on a card (once it's carrying a balance) costs in extra interest |
| `/calculators/prepayment` | A lump-sum prepayment's impact both ways: reduce tenure (same payment, fewer months) vs. reduce EMI (same tenure, smaller payment) |
| `/calculators/balance-transfer` | Whether a balance-transfer fee is worth a teaser rate — break-even month and net savings once the fee and rate reversion are both accounted for |

**Loan offer check**
| Method | Path | What it does |
|---|---|---|
| POST | `/loan-offers/extract` | Multipart PDF upload → best-effort extracted terms (never scored or saved — the user reviews/corrects first) |
| POST | `/loan-offers` | Confirmed terms → true APR, tier, red flags → saved |
| GET | `/loan-offers` | History of past checks |

**Affordability check** (stateless — not tied to a saved loan-offer check)
| Method | Path | What it does |
|---|---|---|
| POST | `/affordability/check` | Debt-to-income readiness verdict + personalized max-affordable-APR ceiling, given income, existing debt payments, and a desired principal/tenure (optionally judged against a specific proposed rate) |

## Current status

Working: debt CRUD; all six payoff/cost calculators (backend + frontend); a
dashboard with an auto-computed payoff hero card, TanStack Query data
fetching, and a payoff-plan page with a balance-over-time chart and
month-by-month payment table; the loan offer check flow (PDF upload → free
regex extraction → review → true-cost scoring → history); and the
affordability check, wired into the loan-offer-check result.

Not yet built: real auth, a persistent/trackable payoff plan (save a chosen
strategy and track actual progress against it), OCR for scanned (non-text)
PDFs, and automated tests for the payoff/scoring math.
