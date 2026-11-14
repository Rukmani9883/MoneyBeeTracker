
import { db, pool } from "./db";
import {
  users,
  incomes,
  expenses,
  savings,
  vaultGoals,
  debts,
  bills,
  transactions,
  sessions,
} from "@shared/schema";
import { and, eq, lt, inArray } from "drizzle-orm";

async function cleanupExpiredAccounts() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const expiredUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.isPermanent, false),
          lt(users.createdAt, cutoff)
        )
      );

    const ids = expiredUsers.map(user => user.id);

    if (ids.length === 0) {
      console.log("No expired accounts found.");
      return;
    }

    await db.transaction(async tx => {
      await tx.delete(incomes).where(inArray(incomes.userId, ids));
      await tx.delete(expenses).where(inArray(expenses.userId, ids));
      await tx.delete(savings).where(inArray(savings.userId, ids));
      await tx.delete(vaultGoals).where(inArray(vaultGoals.userId, ids));
      await tx.delete(debts).where(inArray(debts.userId, ids));
      await tx.delete(bills).where(inArray(bills.userId, ids));
      await tx.delete(transactions).where(inArray(transactions.userId, ids));

      // Recheck account eligibility before deleting users.
      await tx.delete(users).where(
        and(
          inArray(users.id, ids),
          eq(users.isPermanent, false),
          lt(users.createdAt, cutoff)
        )
      );
    });

    console.log(`Deleted ${ids.length} expired account(s).`);
  } catch (error) {
    console.error("Account cleanup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

cleanupExpiredAccounts();
