
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

// Adjust sample dates to the current month.
function adjustDemoDate(value: Date | string | null) {
  if (!value) return value;

  const originalDate = new Date(value);
  const now = new Date();

  const lastDay = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0
  ).getDate();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      Math.min(originalDate.getUTCDate(), lastDay),
      originalDate.getUTCHours(),
      originalDate.getUTCMinutes(),
      originalDate.getUTCSeconds()
    )
  );
}

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

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

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

    // Copy records, adjust dates and map old IDs to new IDs.
    const copyRecords = async (table: any) => {
      const idMap = new Map<number, number>();

      const records = await tx
        .select()
        .from(table)
        .where(eq(table.userId, masterUserId));

      for (const record of records) {
        const { id, userId, ...data } = record;

        if (data.date) {
          data.date = adjustDemoDate(data.date);
        }

        if (data.dueDate) {
          data.dueDate = adjustDemoDate(data.dueDate);
        }

        if (data.deadline) {
          data.deadline = adjustDemoDate(data.deadline);
        }

        if (data.createdAt) {
          data.createdAt = adjustDemoDate(data.createdAt);
        }

        // Update savings month and year.
        if (table === savings) {
          const originalMonth = String(data.month);

          if (/^\d+$/.test(originalMonth)) {
            data.month = originalMonth.length === 2
              ? String(currentMonth).padStart(2, "0")
              : String(currentMonth);
          } else {
            const format = originalMonth.length === 3
              ? "short"
              : "long";

            data.month = now.toLocaleString("en-US", {
              month: format,
              timeZone: "UTC",
            });

            if (originalMonth === originalMonth.toLowerCase()) {
              data.month = data.month.toLowerCase();
            } else if (originalMonth === originalMonth.toUpperCase()) {
              data.month = data.month.toUpperCase();
            }
          }

          data.year = currentYear;
        }

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
          break;
      }

      await tx.insert(transactions).values({
        ...data,
        date: adjustDemoDate(record.date) as Date,
        userId: temporaryUser.id,
        sourceId: mappedSourceId,
        destinationId: mappedDestinationId,
      });
    }

    return temporaryUser;
  });
}
