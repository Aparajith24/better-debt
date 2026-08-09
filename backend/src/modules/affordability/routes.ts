import type { FastifyInstance } from "fastify";
import { evaluateAffordability } from "../../lib/affordability.js";
import { affordabilityCheckSchema } from "./schema.js";

export async function affordabilityRoutes(app: FastifyInstance) {
  // "Should you take this loan right now" — a readiness verdict grounded
  // only in the borrower's own income and existing obligations, plus the
  // personalized max-affordable-APR ceiling to shop against. Never names a
  // lender or product, so it can't go stale like a rate listing would.
  app.post("/affordability/check", async (req, reply) => {
    const input = affordabilityCheckSchema.parse(req.body);
    const result = evaluateAffordability(input);
    return reply.send(result);
  });
}
