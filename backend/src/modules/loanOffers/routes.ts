import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/db.js";
import { DEV_USER_ID } from "../../lib/dev-user.js";
import { extractLoanTermsFromPdf } from "../../lib/loanExtraction.js";
import { evaluateLoanOffer } from "../../lib/trueCost.js";
import { loanOfferTermsSchema } from "./schema.js";
import { serializeLoanOfferCheck } from "./serialize.js";

export async function loanOfferRoutes(app: FastifyInstance) {
  // Reads a loan offer PDF and returns a best-effort guess at its terms for
  // the user to review and correct — never scores or saves anything itself.
  // The LLM only ever reads numbers off a page; the verdict always comes
  // from the deterministic trueCost engine once the user confirms the terms.
  app.post("/loan-offers/extract", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.status(400).send({ error: "No file uploaded" });
    }
    if (file.mimetype !== "application/pdf") {
      return reply.status(400).send({ error: "Only PDF files are supported" });
    }

    const buffer = await file.toBuffer();
    try {
      const result = await extractLoanTermsFromPdf(buffer);
      return reply.send(result);
    } catch (err) {
      req.log.error(err);
      const message = err instanceof Error ? err.message : "Could not read this PDF";
      return reply.status(422).send({ error: message });
    }
  });

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
