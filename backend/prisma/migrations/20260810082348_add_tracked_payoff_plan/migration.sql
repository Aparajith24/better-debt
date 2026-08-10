-- CreateTable
CREATE TABLE "TrackedPayoffPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "extraMonthlyBudget" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMonths" INTEGER NOT NULL,
    "totalInterestPaid" DECIMAL(14,2) NOT NULL,
    "totalPaid" DECIMAL(14,2) NOT NULL,
    "payoffOrder" JSONB NOT NULL,
    "monthlySummary" JSONB NOT NULL,
    "debtNames" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedPayoffPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedPayoffPlan_userId_idx" ON "TrackedPayoffPlan"("userId");
