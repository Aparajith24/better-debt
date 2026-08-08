import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/db.js";
import { DEV_USER_ID } from "../../lib/dev-user.js";
import { evaluateLoanOffer } from "../../lib/trueCost.js";
import { loanOfferTermsSchema } from "./schema.js";
import { serializeLoanOfferCheck } from "./serialize.js";

export async function loanOfferRoutes(app: FastifyInstance) {
  // Scores a loan/EMI/BNPL offer's terms (already confirmed by the user, not
  // raw extraction output) and saves the structured terms + verdict — never
  // the offer document itself.
  app.post("/loan-offers", async (req, reply) => {
    const terms = loanOfferTermsSchema.parse(req.body);
    const result = evaluateLoanOffer(terms);

    const check = await prisma.loanOfferCheck.create({
      data: {
        userId: DEV_USER_ID,
        lenderName: terms.lenderName,
        loanType: terms.loanType,
        principal: terms.principal,
        tenureMonths: terms.tenureMonths,
        rateType: terms.rateType,
        quotedRateAnnual: terms.quotedRateAnnual,
        processingFeeValue: terms.processingFeeValue,
        otherUpfrontFees: terms.otherUpfrontFees,
        prepaymentPenaltyPercent: terms.prepaymentPenaltyPercent,
        teaserRateAnnual: terms.teaserRateAnnual,
        teaserMonths: terms.teaserMonths,
        postTeaserRateAnnual: terms.postTeaserRateAnnual,
        trueApr: result.trueApr,
        tier: result.tier,
        redFlags: result.redFlags,
      },
    });

    return reply.status(201).send({ ...serializeLoanOfferCheck(check), ...result });
  });

  app.get("/loan-offers", async (req, reply) => {
    const checks = await prisma.loanOfferCheck.findMany({
      where: { userId: DEV_USER_ID },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(checks.map(serializeLoanOfferCheck));
  });
}
