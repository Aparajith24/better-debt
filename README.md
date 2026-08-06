# Better Debt

A debt payoff planner: track your debts, compare avalanche vs. snowball payoff
strategies, and see real numbers instead of folklore — flat-rate loans
normalized to their true APR, the actual cost of losing a credit card's grace
period, and a month-by-month plan for what to pay where.

## Stack

- **Backend**: TypeScript, Fastify, Prisma 7 + Postgres, Zod, decimal.js
- **Frontend**: Next.js (App Router), React, Tailwind CSS

## Project structure

```
backend/    Fastify API — debt CRUD + payoff calculators
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

## Current status

Working: debt CRUD, all four calculators (backend + frontend), a dashboard
view for saved debts, and a payoff-plan page with a balance-over-time chart
and a month-by-month payment table.

Not yet built: real auth, a persistent/trackable payoff plan (save a chosen
strategy and track actual progress against it), prepayment and balance-transfer
calculators, and automated tests for the payoff math.
