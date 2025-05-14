import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  profileImage: true,
});

// Income Schema
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  recurring: boolean("recurring").default(false),
  frequency: text("frequency"),
  notes: text("notes"),
});

export const insertIncomeSchema = createInsertSchema(incomes)
  .pick({
    userId: true,
    name: true,
    amount: true,
    category: true,
    date: true,
    recurring: true,
    frequency: true,
    notes: true,
  })
  .extend({
    date: z.string().transform((str) => new Date(str)),
  });

// Expense Schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  recurring: boolean("recurring").default(false),
  frequency: text("frequency"),
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses)
  .pick({
    userId: true,
    name: true,
    amount: true,
    category: true,
    date: true,
    recurring: true,
    frequency: true,
    notes: true,
  })
  .extend({
    date: z.string().transform((str) => new Date(str)),
  });

// Savings Schema
export const savings = pgTable("savings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  amount: doublePrecision("amount").notNull(),
  goal: doublePrecision("goal"),
});

export const insertSavingsSchema = createInsertSchema(savings).pick({
  userId: true,
  month: true,
  year: true,
  amount: true,
  goal: true,
});

// Vault (Future Goals) Schema
export const vaultGoals = pgTable("vault_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").default(0),
  deadline: timestamp("deadline"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVaultGoalSchema = createInsertSchema(vaultGoals)
  .pick({
    userId: true,
    name: true,
    targetAmount: true,
    currentAmount: true,
    deadline: true,
    notes: true,
  })
  .extend({
    deadline: z.string().optional().transform(str => str ? new Date(str) : undefined),
  });

// Debt Schema
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  isOwedByUser: boolean("is_owed_by_user").default(true),
  totalAmount: doublePrecision("total_amount").notNull(),
  remainingAmount: doublePrecision("remaining_amount").notNull(),
  interestRate: doublePrecision("interest_rate"),
  dueDate: timestamp("due_date"),
  monthlyPayment: doublePrecision("monthly_payment"),
  category: text("category"),
  notes: text("notes"),
});

export const insertDebtSchema = createInsertSchema(debts)
  .pick({
    userId: true,
    name: true,
    isOwedByUser: true,
    totalAmount: true,
    remainingAmount: true,
    interestRate: true,
    dueDate: true,
    monthlyPayment: true,
    category: true,
    notes: true,
  })
  .extend({
    dueDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  });

// Bills & EMI Schema
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  category: text("category").notNull(),
  recurring: boolean("recurring").default(true),
  frequency: text("frequency").default("monthly"),
  isPaid: boolean("is_paid").default(false),
  reminderDays: integer("reminder_days").default(3),
  autoPayment: boolean("auto_payment").default(false),
  notes: text("notes"),
});

export const insertBillSchema = createInsertSchema(bills)
  .pick({
    userId: true,
    name: true,
    amount: true,
    dueDate: true,
    category: true,
    recurring: true,
    frequency: true,
    isPaid: true,
    reminderDays: true,
    autoPayment: true,
    notes: true,
  })
  .extend({
    dueDate: z.string().transform(str => new Date(str)),
  });

// Transaction Schema (for transfers between accounts)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "income", "expense", "transfer"
  sourceId: integer("source_id"),
  destinationId: integer("destination_id"),
  amount: doublePrecision("amount").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  category: text("category"),
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .pick({
    userId: true,
    type: true,
    sourceId: true,
    destinationId: true,
    amount: true,
    description: true,
    date: true,
    category: true,
  })
  .extend({
    date: z.string().transform(str => new Date(str)),
  });

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Saving = typeof savings.$inferSelect;
export type InsertSaving = z.infer<typeof insertSavingsSchema>;

export type VaultGoal = typeof vaultGoals.$inferSelect;
export type InsertVaultGoal = z.infer<typeof insertVaultGoalSchema>;

// Debt types removed

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Debt types
export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;
