-- CreateTable
CREATE TABLE "LoanOfferCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lenderName" TEXT,
    "loanType" "DebtType" NOT NULL DEFAULT 'OTHER',
    "principal" DECIMAL(14,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'REDUCING',
    "quotedRateAnnual" DECIMAL(6,3) NOT NULL,
    "processingFeeValue" DECIMAL(10,2) NOT NULL,
    "otherUpfrontFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prepaymentPenaltyPercent" DECIMAL(5,2),
    "teaserRateAnnual" DECIMAL(6,3),
    "teaserMonths" INTEGER,
    "postTeaserRateAnnual" DECIMAL(6,3),
    "trueApr" DECIMAL(6,3) NOT NULL,
    "tier" TEXT NOT NULL,
    "redFlags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanOfferCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanOfferCheck_userId_idx" ON "LoanOfferCheck"("userId");
