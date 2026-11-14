
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
import { and, eq, lt, inArray, sql } from "drizzle-orm";

async function cleanupExpiredAccounts() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      // Prevent concurrent cleanup jobs.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(721009)`
      );

      const expiredUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.isPermanent, false),
            lt(users.createdAt, cutoff)
          )
        )
        .for("update");

      const ids = expiredUsers.map((user) => user.id);

      if (process.env.CLEANUP_DRY_RUN !== "false") {
        console.log(
          `[DRY RUN] ${ids.length} account(s) eligible for deletion.`
        );
        return 0;
      }

      if (ids.length === 0) return 0;

      // Remove sessions belonging to expired accounts.
      await tx.delete(sessions).where(
        sql`(${sessions.sess}->>'userId') ~ '^[0-9]+$'
          AND (${sessions.sess}->>'userId')::integer IN
          (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
      );

      // Delete all financial records.
      await tx.delete(incomes).where(inArray(incomes.userId, ids));
      await tx.delete(expenses).where(inArray(expenses.userId, ids));
      await tx.delete(savings).where(inArray(savings.userId, ids));
      await tx.delete(vaultGoals).where(inArray(vaultGoals.userId, ids));
      await tx.delete(debts).where(inArray(debts.userId, ids));
      await tx.delete(bills).where(inArray(bills.userId, ids));
      await tx.delete(transactions).where(inArray(transactions.userId, ids));

      // Delete expired, non-permanent accounts.
      await tx.delete(users).where(
        and(
          inArray(users.id, ids),
          eq(users.isPermanent, false),
          lt(users.createdAt, cutoff)
        )
      );

      return ids.length;
    });

    console.log(`Deleted ${deletedCount} expired account(s).`);
  } catch (error) {
    console.error("Account cleanup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

cleanupExpiredAccounts();

