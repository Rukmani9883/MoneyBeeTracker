
import { db } from "./db";
import {
  users,
  incomes,
  expenses,
  savings,
  vaultGoals,
  debts,
  bills,
  transactions,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export async function createTemporaryDemoUser(masterUserId: number) {
  return db.transaction(async (tx) => {
    const [master] = await tx
      .select()
      .from(users)
      .where(eq(users.id, masterUserId));

    if (
      !master ||
      master.username !== "Demo" ||
      !master.isPermanent
    ) {
      throw new Error("Permanent Demo account not found");
    }

    const uniqueId = randomBytes(16).toString("hex");
    const randomPassword = randomBytes(32).toString("hex");

    const [temporaryUser] = await tx
      .insert(users)
      .values({
        username: `demo_${uniqueId}`,
        password: await bcrypt.hash(randomPassword, 10),
        name: "Demo Visitor",
        email: null,
        isPermanent: false,
      })
      .returning();

    // Copy records and map old IDs to new IDs.
    const copyRecords = async (table: any) => {
      const idMap = new Map<number, number>();

      const records = await tx
        .select()
        .from(table)
        .where(eq(table.userId, masterUserId));

      for (const record of records) {
        const { id, userId, ...data } = record;

        const [copy] = await tx
          .insert(table)
          .values({
            ...data,
            userId: temporaryUser.id,
          })
          .returning();

        idMap.set(id, copy.id);
      }

      return idMap;
    };

    const incomeIds = await copyRecords(incomes);
    const expenseIds = await copyRecords(expenses);

    await copyRecords(savings);
    await copyRecords(vaultGoals);

    const debtIds = await copyRecords(debts);
    const billIds = await copyRecords(bills);

    const sourceTransactions = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.userId, masterUserId));

    for (const record of sourceTransactions) {
      const {
        id,
        userId,
        sourceId,
        destinationId,
        ...data
      } = record;

      let mappedSourceId: number | null = null;
      let mappedDestinationId: number | null = null;

      switch (record.type.toLowerCase()) {
        case "income":
          mappedSourceId =
            sourceId == null
              ? null
              : incomeIds.get(sourceId) ?? null;
          break;

        case "expense":
          mappedSourceId =
            sourceId == null
              ? null
              : expenseIds.get(sourceId) ?? null;
          break;

        case "debt":
          mappedSourceId =
            sourceId == null
              ? null
              : debtIds.get(sourceId) ?? null;
          break;

        case "bill":
          mappedSourceId =
            sourceId == null
              ? null
              : billIds.get(sourceId) ?? null;
          break;

        default:
          // Other transaction types need their own mapping
          // rules if they reference financial records.
          break;
      }

      await tx.insert(transactions).values({
        ...data,
        userId: temporaryUser.id,
        sourceId: mappedSourceId,
        destinationId: mappedDestinationId,
      });
    }

    return temporaryUser;
  });
}

