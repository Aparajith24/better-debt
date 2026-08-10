import type { Prisma, TrackedPayoffPlan } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/db.js";
import { DEV_USER_ID } from "../../lib/dev-user.js";
import type { MonthSummary } from "../../lib/multiDebtPayoff.js";
import { simulateMultiDebtPayoff } from "../../lib/multiDebtPayoff.js";
import { computeProgress, type PlanSnapshot } from "../../lib/planProgress.js";
import { resolveEffectiveAnnualRate } from "../../lib/rateNormalization.js";
import { createTrackedPlanSchema, trackedPlanIdParamsSchema } from "./schema.js";
import { serializeTrackedPlan } from "./serialize.js";

async function progressFor(plan: TrackedPayoffPlan) {
  const payoffOrder = plan.payoffOrder as string[];
  const debts = await prisma.debt.findMany({
    where: { id: { in: payoffOrder } },
    select: { id: true, currentBalance: true },
  });
  const currentBalances = new Map(debts.map((d) => [d.id, Number(d.currentBalance)]));

  const snapshot: PlanSnapshot = {
    startDate: plan.startDate,
    totalMonths: plan.totalMonths,
    totalPaid: plan.totalPaid.toFixed(2),
    totalInterestPaid: plan.totalInterestPaid.toFixed(2),
    payoffOrder,
    monthlySummary: plan.monthlySummary as unknown as MonthSummary[],
  };
  return computeProgress(snapshot, currentBalances);
}

export async function payoffPlanRoutes(app: FastifyInstance) {
  // Snapshots a chosen avalanche/snowball strategy so progress can be judged
  // against it later — same simulation the stateless /calculators/payoff-plan
  // endpoint runs, just persisted. Starting a new plan replaces the old one:
  // only one tracked plan is "the" plan at a time.
  app.post("/payoff-plans", async (req, reply) => {
    const { debts, extraMonthlyBudget, strategy } = createTrackedPlanSchema.parse(req.body);

    const normalizedDebts = debts.map((d) => ({
      id: d.id,
      balance: d.balance,
      minPayment: d.minPayment,
      interestRateAnnual: resolveEffectiveAnnualRate(d),
    }));
    const plan = simulateMultiDebtPayoff(normalizedDebts, extraMonthlyBudget, strategy);

    await prisma.trackedPayoffPlan.updateMany({
      where: { userId: DEV_USER_ID, status: "ACTIVE" },
      data: { status: "ABANDONED" },
    });

    const created = await prisma.trackedPayoffPlan.create({
      data: {
        userId: DEV_USER_ID,
        strategy,
        extraMonthlyBudget,
        status: "ACTIVE",
        totalMonths: plan.totalMonths,
        totalInterestPaid: plan.totalInterestPaid,
        totalPaid: plan.totalPaid,
        payoffOrder: plan.payoffOrder,
        monthlySummary: plan.monthlySummary as unknown as Prisma.InputJsonValue,
        debtNames: Object.fromEntries(debts.map((d) => [d.id, d.name])),
      },
    });

    const progress = await progressFor(created);
    return reply.status(201).send({ plan: serializeTrackedPlan(created), progress });
  });

  // The single active plan (if any) plus how the user's actual debt balances
  // compare to what the plan expected at this point — inferred from each
  // debt's existing currentBalance, no separate payment logging required.
  app.get("/payoff-plans/active", async (req, reply) => {
    const plan = await prisma.trackedPayoffPlan.findFirst({
      where: { userId: DEV_USER_ID, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!plan) return reply.send(null);

    const progress = await progressFor(plan);
    if (progress.status === "COMPLETED") {
      await prisma.trackedPayoffPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED" } });
      plan.status = "COMPLETED";
    }

    return reply.send({ plan: serializeTrackedPlan(plan), progress });
  });

  app.post("/payoff-plans/:id/abandon", async (req, reply) => {
    const { id } = trackedPlanIdParamsSchema.parse(req.params);
    const existing = await prisma.trackedPayoffPlan.findFirst({ where: { id, userId: DEV_USER_ID } });
    if (!existing) return reply.status(404).send({ error: "Plan not found" });

    const updated = await prisma.trackedPayoffPlan.update({
      where: { id },
      data: { status: "ABANDONED" },
    });
    return reply.send(serializeTrackedPlan(updated));
  });
}
