<h1 align="center">
💸 Better Debt
</h1>

<p align="center">
Real numbers instead of debt folklore — and a check before you sign anything new.
</p>

<p align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Fastify](https://img.shields.io/badge/Fastify-5.x-black)
![Postgres](https://img.shields.io/badge/Postgres-Prisma%207-336791)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5.x-FF4154)
![Status](https://img.shields.io/badge/status-personal%20project-lightgrey)

</p>

A debt payoff planner — and a debt *decision* tool. Track your debts, compare
avalanche vs. snowball strategies, and see real numbers instead of folklore:
flat-rate loans normalized to their true APR, what a lump-sum prepayment is
actually worth, whether a balance transfer is worth its fee. And, before you
sign anything new: upload the offer PDF, get its true cost and a red-flag
list, and find out whether you can actually afford it.

## Why

Most "debt calculators" take the number a lender quotes you at face value.
The numbers lenders quote and the numbers that determine what you actually
pay are frequently not the same number:

| What a lender shows you | What it actually means | What this app shows instead |
|---|---|---|
| "18% flat rate" | ~1.7-2x higher as an actual APR — flat rate charges interest on the *original* amount for the whole tenure, not the declining balance | The true reducing-balance APR, computed, not estimated |
| "0% EMI" | Often has a processing fee baked in that makes it non-zero-cost | True APR with every upfront fee folded in |
| "3% balance transfer fee, 0% for 12 months" | The fee has to be earned back before the transfer is actually a win | The exact month you break even, and the net savings after that |
| A loan offer PDF | Terms scattered across pages of legal text | Extracted terms, a true-APR tier, and a plain-language red-flag list |
| "You qualify for this loan" | Qualifying and being able to comfortably afford it are different questions | A debt-to-income readiness verdict and a personalized max-affordable-rate ceiling |

None of this is AI-generated advice — every number above comes from a
deterministic calculation you can re-derive by hand (see `backend/src/lib/`).
The one place free-text extraction is involved (reading a loan PDF) is a
regex-based extractor with no API cost and no external dependency — the
computed numbers never depend on it being right, because you review and
correct what it found before anything is scored.

## When to use it

- You're comparing **whether to take a new loan/EMI/BNPL offer** and want the
  real cost, not the marketing rate — and whether your budget can actually
  absorb the payment.
- You're juggling **several existing debts** and want avalanche vs. snowball
  compared on your actual numbers, with a plan you can save and track month
  to month instead of a one-time printout.
- You're deciding whether a **balance transfer or prepayment** is worth it,
  fee included.
- You have a **flat-rate loan** (common for consumer-durable EMIs in India)
  and want to know what it actually costs against a card or personal loan
  quoted as an APR.

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

## Features

**Manage debt you already have**
- Debt CRUD with support for both reducing-balance and flat-rate loans.
- Avalanche vs. snowball payoff planning across all your debts at once, with
  a balance-over-time chart and a month-by-month payment table.
- **Save a plan and track it.** Commit to a strategy and the dashboard shows
  your actual progress against it — expected vs. real combined balance,
  ahead/on-track/behind — inferred from your debts' existing balances, no
  separate payment log to maintain.
- A dashboard hero card that auto-runs the payoff plan on your saved debts —
  projected debt-free date, which debt to attack first, and how much
  avalanche saves over snowball.
- Single-debt payoff projection, flat-rate → true-APR normalization,
  credit-card grace-period cost, prepayment impact, and balance-transfer
  break-even.

**Evaluate a loan before you take it**
- **Loan offer check**: upload a loan/EMI/BNPL/credit-card offer PDF. A free,
  offline, regex-based extractor reads the terms off the page. You review
  and correct whatever it couldn't find, then it computes the offer's
  **true APR** (every upfront fee folded into one comparable rate), a tier
  (`GREAT` / `FAIR` / `HIGH_COST` / `PREDATORY`), and a red-flag list.
- **Affordability check**: a second, independent verdict on the same offer —
  not "is this a good rate" but "can *you* handle the payment." A readiness
  verdict (`GOOD_TIME` / `TIGHT` / `NOT_RECOMMENDED`) plus a personalized
  max-affordable-APR ceiling, grounded only in your own income and existing
  obligations — never a lender's product listing.

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

A debt has a `rateType` of `FLAT` or `REDUCING`. `FLAT` debts require
`principal` and `tenureMonths` so their true APR can be worked out.

**Calculators** (all `POST`, all stateless)
| Path | What it does |
|---|---|
| `/calculators/single-debt-projection` | Months and total interest to clear one debt at a fixed payment |
| `/calculators/payoff-plan` | Avalanche vs. snowball across several debts, with a shared extra budget |
| `/calculators/normalize-flat-rate` | Converts a flat-rate loan into its equivalent reducing-balance APR |
| `/calculators/credit-card-projection` | Cost of continuing to spend on a card once it's carrying a balance |
| `/calculators/prepayment` | A lump-sum prepayment's impact: reduce tenure vs. reduce EMI |
| `/calculators/balance-transfer` | Break-even month and net savings for a balance transfer, fee included |

**Trackable payoff plan**
| Method | Path | What it does |
|---|---|---|
| POST | `/payoff-plans` | Snapshot a chosen strategy and start tracking it (replaces any previously active plan) |
| GET | `/payoff-plans/active` | The active plan plus progress inferred from current debt balances |
| POST | `/payoff-plans/:id/abandon` | Stop tracking without deleting the history |

**Loan offer check**
| Method | Path | What it does |
|---|---|---|
| POST | `/loan-offers/extract` | Multipart PDF upload → best-effort extracted terms (never scored or saved) |
| POST | `/loan-offers` | Confirmed terms → true APR, tier, red flags → saved |
| GET | `/loan-offers` | History of past checks |

**Affordability check** (stateless)
| Method | Path | What it does |
|---|---|---|
| POST | `/affordability/check` | Debt-to-income readiness verdict + personalized max-affordable-APR ceiling |

## Scope

Verified end to end against real loan-offer PDF formats (both prose-style
letters and labeled summary tables), and all payoff/cost/affordability math
spot-checked by hand against known inputs. Not yet built: real auth (single
hardcoded dev user today), OCR for scanned (non-text) PDFs, and an automated
test suite — everything above was verified manually during development, not
via a committed test suite.
