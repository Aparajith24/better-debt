-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FLAT', 'REDUCING');

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "rateType" "RateType" NOT NULL DEFAULT 'REDUCING';
