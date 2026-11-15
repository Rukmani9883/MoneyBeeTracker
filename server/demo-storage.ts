
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

export async function createTemporaryDemoUser(masterUserId: number) {
  return db.transaction(async (tx) => {
    // Confirm that the source is the permanent Demo account.
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

    // Each visitor receives a unique, temporary account.
    const uniqueId = randomBytes(16).toString("hex");

    const [temporaryUser] = await tx
      .insert(users)
      .values({
        username: `demo_${uniqueId}`,
        password: randomBytes(32).toString("hex"),
        name: "Demo Visitor",
        email: null,
        isPermanent: false,
      })
      .returning();

    // Copy records without reusing their original IDs.
    const copyRecords = async (table: any) => {
      const records = await tx
        .select()
        .from(table)
        .where(eq(table.userId, masterUserId));

      if (records.length === 0) return;

      const copies = records.map((record: any) => {
        const { id, userId, ...data } = record;

        return {
          ...data,
          userId: temporaryUser.id,
        };
      });

      await tx.insert(table).values(copies);
    };

    await copyRecords(incomes);
    await copyRecords(expenses);
    await copyRecords(savings);
    await copyRecords(vaultGoals);
    await copyRecords(debts);
    await copyRecords(bills);

    // Transactions can reference IDs from other tables.
    // Copy them with new references to the copied records.
    const sourceTransactions = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.userId, masterUserId));

    if (sourceTransactions.length > 0) {
      const copies = sourceTransactions.map((record) => {
        const {
          id,
          userId,
          sourceId,
          destinationId,
          ...data
        } = record;

        return {
          ...data,
          userId: temporaryUser.id,
          sourceId: null,
          destinationId: null,
        };
      });

      await tx.insert(transactions).values(copies);
    }

    return temporaryUser;
  });
}
