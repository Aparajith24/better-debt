import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/db.js";
import { DEV_USER_ID } from "../../lib/dev-user.js";
import { createDebtSchema, debtIdParamsSchema, updateDebtSchema } from "./schema.js";
import { serializeDebt } from "./serialize.js";

export async function debtRoutes(app: FastifyInstance) {
  app.get("/debts", async (req, reply) => {
    const debts = await prisma.debt.findMany({
      where: { userId: DEV_USER_ID, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(debts.map(serializeDebt));
  });

  app.get("/debts/:id", async (req, reply) => {
    const { id } = debtIdParamsSchema.parse(req.params);
    const debt = await prisma.debt.findFirst({ where: { id, userId: DEV_USER_ID } });
    if (!debt) return reply.status(404).send({ error: "Debt not found" });
    return reply.send(serializeDebt(debt));
  });

  app.post("/debts", async (req, reply) => {
    const input = createDebtSchema.parse(req.body);
    const debt = await prisma.debt.create({
      data: { ...input, userId: DEV_USER_ID },
    });
    return reply.status(201).send(serializeDebt(debt));
  });

  app.patch("/debts/:id", async (req, reply) => {
    const { id } = debtIdParamsSchema.parse(req.params);
    const input = updateDebtSchema.parse(req.body);

    const existing = await prisma.debt.findFirst({ where: { id, userId: DEV_USER_ID } });
    if (!existing) return reply.status(404).send({ error: "Debt not found" });

    const debt = await prisma.debt.update({ where: { id }, data: input });
    return reply.send(serializeDebt(debt));
  });

  app.delete("/debts/:id", async (req, reply) => {
    const { id } = debtIdParamsSchema.parse(req.params);
    const existing = await prisma.debt.findFirst({ where: { id, userId: DEV_USER_ID } });
    if (!existing) return reply.status(404).send({ error: "Debt not found" });

    await prisma.debt.delete({ where: { id } });
    return reply.status(204).send();
  });
}
