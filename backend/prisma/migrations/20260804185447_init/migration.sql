-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('CREDIT_CARD', 'PERSONAL_LOAN', 'EMI', 'BNPL', 'OTHER');

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "principal" DECIMAL(14,2),
    "currentBalance" DECIMAL(14,2) NOT NULL,
    "interestRateAnnual" DECIMAL(6,3) NOT NULL,
    "minPayment" DECIMAL(14,2),
    "dueDay" INTEGER,
    "tenureMonths" INTEGER,
    "startDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");
