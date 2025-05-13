import {
  users, User, InsertUser,
  incomes, Income, InsertIncome,
  expenses, Expense, InsertExpense,
  savings, Saving, InsertSaving,
  vaultGoals, VaultGoal, InsertVaultGoal,
  debts, Debt, InsertDebt,
  bills, Bill, InsertBill,
  transactions, Transaction, InsertTransaction
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, count } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Income
  getIncomes(userId: number): Promise<Income[]>;
  getIncomeById(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income | undefined>;
  deleteIncome(id: number): Promise<boolean>;
  getMonthlyIncome(userId: number, month: number, year: number): Promise<Income[]>;
  getTotalIncome(userId: number, month: number, year: number): Promise<number>;

  // Expenses
  getExpenses(userId: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getMonthlyExpenses(userId: number, month: number, year: number): Promise<Expense[]>;
  getTotalExpenses(userId: number, month: number, year: number): Promise<number>;

  // Savings
  getSavings(userId: number): Promise<Saving[]>;
  getSavingById(id: number): Promise<Saving | undefined>;
  createSaving(saving: InsertSaving): Promise<Saving>;
  updateSaving(id: number, saving: Partial<InsertSaving>): Promise<Saving | undefined>;
  deleteSaving(id: number): Promise<boolean>;
  getMonthlySavings(userId: number, month: string, year: number): Promise<Saving | undefined>;
  getYearlySavings(userId: number, year: number): Promise<Saving[]>;

  // Vault Goals
  getVaultGoals(userId: number): Promise<VaultGoal[]>;
  getVaultGoalById(id: number): Promise<VaultGoal | undefined>;
  createVaultGoal(goal: InsertVaultGoal): Promise<VaultGoal>;
  updateVaultGoal(id: number, goal: Partial<InsertVaultGoal>): Promise<VaultGoal | undefined>;
  deleteVaultGoal(id: number): Promise<boolean>;
  addFundsToGoal(id: number, amount: number): Promise<VaultGoal | undefined>;
  withdrawFundsFromGoal(id: number, amount: number): Promise<VaultGoal | undefined>;

  // Debts
  getDebts(userId: number): Promise<Debt[]>;
  getDebtById(id: number): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: number): Promise<boolean>;
  getDebtsByOwnership(userId: number, isOwedByUser: boolean): Promise<Debt[]>;
  getTotalDebts(userId: number, isOwedByUser: boolean): Promise<number>;

  // Bills
  getBills(userId: number): Promise<Bill[]>;
  getBillById(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;
  getUpcomingBills(userId: number, daysAhead: number): Promise<Bill[]>;
  markBillAsPaid(id: number): Promise<Bill | undefined>;
  getUnpaidBills(userId: number): Promise<Bill[]>;
  getBillsForMonth(userId: number, month: number, year: number): Promise<Bill[]>;

  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getRecentTransactions(userId: number, limit: number): Promise<Transaction[]>;
  getMonthlyTransactions(userId: number, month: number, year: number): Promise<Transaction[]>;
  
  // Data Management
  clearAllData(userId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private incomes: Map<number, Income>;
  private expenses: Map<number, Expense>;
  private savings: Map<number, Saving>;
  private vaultGoals: Map<number, VaultGoal>;
  private debts: Map<number, Debt>;
  private bills: Map<number, Bill>;
  private transactions: Map<number, Transaction>;
  
  private userId: number;
  private incomeId: number;
  private expenseId: number;
  private savingId: number;
  private vaultGoalId: number;
  private debtId: number;
  private billId: number;
  private transactionId: number;

  constructor() {
    this.users = new Map();
    this.incomes = new Map();
    this.expenses = new Map();
    this.savings = new Map();
    this.vaultGoals = new Map();
    this.debts = new Map();
    this.bills = new Map();
    this.transactions = new Map();
    
    this.userId = 1;
    this.incomeId = 1;
    this.expenseId = 1;
    this.savingId = 1;
    this.vaultGoalId = 1;
    this.debtId = 1;
    this.billId = 1;
    this.transactionId = 1;

    // Create a test user
    this.createUser({
      username: "testuser",
      password: "password123",
      name: "Alex Johnson",
      email: "alex@example.com"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  // Income methods
  async getIncomes(userId: number): Promise<Income[]> {
    return Array.from(this.incomes.values())
      .filter(income => income.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getIncomeById(id: number): Promise<Income | undefined> {
    return this.incomes.get(id);
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
    const id = this.incomeId++;
    const income: Income = { ...insertIncome, id };
    this.incomes.set(id, income);
    
    // Create a transaction record for this income
    await this.createTransaction({
      userId: income.userId,
      type: "income",
      amount: income.amount,
      description: income.name,
      date: income.date,
      category: income.category,
      sourceId: null,
      destinationId: null
    });
    
    return income;
  }

  async updateIncome(id: number, incomeUpdate: Partial<InsertIncome>): Promise<Income | undefined> {
    const existingIncome = this.incomes.get(id);
    if (!existingIncome) return undefined;
    
    const updatedIncome = { ...existingIncome, ...incomeUpdate };
    this.incomes.set(id, updatedIncome);
    return updatedIncome;
  }

  async deleteIncome(id: number): Promise<boolean> {
    const income = this.incomes.get(id);
    if (!income) return false;

    // Delete all related transactions
    await this.deleteRelatedTransactions(income.userId, "income", income.name);
    
    return this.incomes.delete(id);
  }
  
  // Helper method to delete transactions related to an income/expense/debt record
  private async deleteRelatedTransactions(
    userId: number, 
    type: string, 
    description: string
  ): Promise<void> {
    const transactionsToRemove: number[] = [];
    
    this.transactions.forEach((transaction, transactionId) => {
      if (
        transaction.userId === userId &&
        transaction.type === type &&
        transaction.description === description
      ) {
        transactionsToRemove.push(transactionId);
      }
    });
    
    for (const transactionId of transactionsToRemove) {
      this.transactions.delete(transactionId);
    }
  }

  async getMonthlyIncome(userId: number, month: number, year: number): Promise<Income[]> {
    return Array.from(this.incomes.values())
      .filter(income => {
        const date = new Date(income.date);
        return income.userId === userId && 
               date.getMonth() === month && 
               date.getFullYear() === year;
      });
  }

  async getTotalIncome(userId: number, month: number, year: number): Promise<number> {
    const monthlyIncomes = await this.getMonthlyIncome(userId, month, year);
    return monthlyIncomes.reduce((total, income) => total + income.amount, 0);
  }

  // Expense methods
  async getExpenses(userId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const expense: Expense = { ...insertExpense, id };
    this.expenses.set(id, expense);
    
    // Create a transaction record for this expense
    await this.createTransaction({
      userId: expense.userId,
      type: "expense",
      amount: expense.amount,
      description: expense.name,
      date: expense.date,
      category: expense.category,
      sourceId: null,
      destinationId: null
    });
    
    return expense;
  }

  async updateExpense(id: number, expenseUpdate: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(id);
    if (!existingExpense) return undefined;
    
    const updatedExpense = { ...existingExpense, ...expenseUpdate };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const expense = this.expenses.get(id);
    if (!expense) return false;

    // Delete all related transactions
    await this.deleteRelatedTransactions(expense.userId, "expense", expense.name);
    
    return this.expenses.delete(id);
  }

  async getMonthlyExpenses(userId: number, month: number, year: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => {
        const date = new Date(expense.date);
        return expense.userId === userId && 
               date.getMonth() === month && 
               date.getFullYear() === year;
      });
  }

  async getTotalExpenses(userId: number, month: number, year: number): Promise<number> {
    const monthlyExpenses = await this.getMonthlyExpenses(userId, month, year);
    return monthlyExpenses.reduce((total, expense) => total + expense.amount, 0);
  }

  // Savings methods
  async getSavings(userId: number): Promise<Saving[]> {
    return Array.from(this.savings.values())
      .filter(saving => saving.userId === userId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        // Sort by month name (assuming month is stored as "January", "February", etc.)
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months.indexOf(b.month) - months.indexOf(a.month);
      });
  }

  async getSavingById(id: number): Promise<Saving | undefined> {
    return this.savings.get(id);
  }

  async createSaving(insertSaving: InsertSaving): Promise<Saving> {
    const id = this.savingId++;
    const saving: Saving = { ...insertSaving, id };
    this.savings.set(id, saving);
    return saving;
  }

  async updateSaving(id: number, savingUpdate: Partial<InsertSaving>): Promise<Saving | undefined> {
    const existingSaving = this.savings.get(id);
    if (!existingSaving) return undefined;
    
    const updatedSaving = { ...existingSaving, ...savingUpdate };
    this.savings.set(id, updatedSaving);
    return updatedSaving;
  }

  async deleteSaving(id: number): Promise<boolean> {
    return this.savings.delete(id);
  }

  async getMonthlySavings(userId: number, month: string, year: number): Promise<Saving | undefined> {
    return Array.from(this.savings.values())
      .find(saving => 
        saving.userId === userId && 
        saving.month === month && 
        saving.year === year
      );
  }

  async getYearlySavings(userId: number, year: number): Promise<Saving[]> {
    return Array.from(this.savings.values())
      .filter(saving => 
        saving.userId === userId && 
        saving.year === year
      );
  }

  // Vault Goal methods
  async getVaultGoals(userId: number): Promise<VaultGoal[]> {
    return Array.from(this.vaultGoals.values())
      .filter(goal => goal.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getVaultGoalById(id: number): Promise<VaultGoal | undefined> {
    return this.vaultGoals.get(id);
  }

  async createVaultGoal(insertGoal: InsertVaultGoal): Promise<VaultGoal> {
    const id = this.vaultGoalId++;
    const now = new Date();
    const goal: VaultGoal = { ...insertGoal, id, createdAt: now };
    this.vaultGoals.set(id, goal);
    return goal;
  }

  async updateVaultGoal(id: number, goalUpdate: Partial<InsertVaultGoal>): Promise<VaultGoal | undefined> {
    const existingGoal = this.vaultGoals.get(id);
    if (!existingGoal) return undefined;
    
    const updatedGoal = { ...existingGoal, ...goalUpdate };
    this.vaultGoals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteVaultGoal(id: number): Promise<boolean> {
    return this.vaultGoals.delete(id);
  }

  async addFundsToGoal(id: number, amount: number): Promise<VaultGoal | undefined> {
    const goal = this.vaultGoals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { 
      ...goal, 
      currentAmount: goal.currentAmount + amount 
    };
    this.vaultGoals.set(id, updatedGoal);
    
    // Create a transaction for this transfer
    await this.createTransaction({
      userId: goal.userId,
      type: "transfer",
      sourceId: null,
      destinationId: id,
      amount: amount,
      description: `Added funds to ${goal.name}`,
      date: new Date(),
      category: "savings"
    });
    
    return updatedGoal;
  }

  async withdrawFundsFromGoal(id: number, amount: number): Promise<VaultGoal | undefined> {
    const goal = this.vaultGoals.get(id);
    if (!goal || goal.currentAmount < amount) return undefined;
    
    const updatedGoal = { 
      ...goal, 
      currentAmount: goal.currentAmount - amount 
    };
    this.vaultGoals.set(id, updatedGoal);
    
    // Create a transaction for this withdrawal
    await this.createTransaction({
      userId: goal.userId,
      type: "transfer",
      sourceId: id,
      destinationId: null,
      amount: amount,
      description: `Withdrew funds from ${goal.name}`,
      date: new Date(),
      category: "withdrawal"
    });
    
    return updatedGoal;
  }

  // Debt methods
  async getDebts(userId: number): Promise<Debt[]> {
    return Array.from(this.debts.values())
      .filter(debt => debt.userId === userId)
      .sort((a, b) => {
        // Sort by due date if available, otherwise by id
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.id - b.id;
      });
  }

  async getDebtById(id: number): Promise<Debt | undefined> {
    return this.debts.get(id);
  }

  async createDebt(insertDebt: InsertDebt): Promise<Debt> {
    const id = this.debtId++;
    const debt: Debt = { ...insertDebt, id };
    this.debts.set(id, debt);
    return debt;
  }

  async updateDebt(id: number, debtUpdate: Partial<InsertDebt>): Promise<Debt | undefined> {
    const existingDebt = this.debts.get(id);
    if (!existingDebt) return undefined;
    
    const updatedDebt = { ...existingDebt, ...debtUpdate };
    this.debts.set(id, updatedDebt);
    return updatedDebt;
  }

  async deleteDebt(id: number): Promise<boolean> {
    const debt = this.debts.get(id);
    if (!debt) return false;

    // Delete all related transactions
    await this.deleteRelatedTransactions(debt.userId, "expense", debt.name);
    
    return this.debts.delete(id);
  }

  async getDebtsByOwnership(userId: number, isOwedByUser: boolean): Promise<Debt[]> {
    return Array.from(this.debts.values())
      .filter(debt => 
        debt.userId === userId && 
        debt.isOwedByUser === isOwedByUser
      );
  }

  async getTotalDebts(userId: number, isOwedByUser: boolean): Promise<number> {
    const debts = await this.getDebtsByOwnership(userId, isOwedByUser);
    return debts.reduce((total, debt) => total + debt.remainingAmount, 0);
  }

  // Bill methods
  async getBills(userId: number): Promise<Bill[]> {
    return Array.from(this.bills.values())
      .filter(bill => bill.userId === userId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async getBillById(id: number): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = this.billId++;
    const bill: Bill = { ...insertBill, id };
    this.bills.set(id, bill);
    return bill;
  }

  async updateBill(id: number, billUpdate: Partial<InsertBill>): Promise<Bill | undefined> {
    const existingBill = this.bills.get(id);
    if (!existingBill) return undefined;
    
    const updatedBill = { ...existingBill, ...billUpdate };
    this.bills.set(id, updatedBill);
    return updatedBill;
  }

  async deleteBill(id: number): Promise<boolean> {
    const bill = this.bills.get(id);
    if (!bill) return false;

    // Delete all related transactions
    await this.deleteRelatedTransactions(bill.userId, "expense", bill.name);
    
    return this.bills.delete(id);
  }

  async getUpcomingBills(userId: number, daysAhead: number): Promise<Bill[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);
    
    return Array.from(this.bills.values())
      .filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return bill.userId === userId && 
              !bill.isPaid && 
              dueDate >= now && 
              dueDate <= futureDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async markBillAsPaid(id: number): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    if (!bill) return undefined;
    
    const updatedBill = { ...bill, isPaid: true };
    this.bills.set(id, updatedBill);
    
    // Create an expense for this bill payment
    await this.createExpense({
      userId: bill.userId,
      name: `Payment for ${bill.name}`,
      amount: bill.amount,
      category: bill.category,
      date: new Date(),
      recurring: false,
      frequency: null,
      notes: `Automatic expense created for bill payment`
    });
    
    // Create a transaction record for the bill payment
    await this.createTransaction({
      userId: bill.userId,
      date: new Date(),
      type: "expense",
      amount: bill.amount,
      category: bill.category,
      description: `Bill payment: ${bill.name}`,
      sourceId: null,
      destinationId: null
    });
    
    return updatedBill;
  }

  async getUnpaidBills(userId: number): Promise<Bill[]> {
    return Array.from(this.bills.values())
      .filter(bill => 
        bill.userId === userId && 
        !bill.isPaid
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
  
  async getBillsForMonth(userId: number, month: number, year: number): Promise<Bill[]> {
    // Create date range for the specified month (month is 1-indexed in params but 0-indexed in JS Date)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return Array.from(this.bills.values())
      .filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return bill.userId === userId && 
               dueDate >= startDate && 
               dueDate <= endDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Transaction methods
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getRecentTransactions(userId: number, limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }
  
  async getMonthlyTransactions(userId: number, month: number, year: number): Promise<Transaction[]> {
    // Create date range for the specified month (month is 1-indexed in params but 0-indexed in JS Date)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    // Get existing transactions for this month
    const existingTransactions = Array.from(this.transactions.values())
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transaction.userId === userId && 
               transactionDate >= startDate && 
               transactionDate <= endDate;
      });
    
    // Get incomes for this month and convert to transaction format
    const incomeTransactions = Array.from(this.incomes.values())
      .filter(income => {
        const incomeDate = new Date(income.date);
        return income.userId === userId && 
               incomeDate >= startDate && 
               incomeDate <= endDate;
      })
      .map(income => {
        // Check if this income already has a transaction record
        const existingTransaction = existingTransactions.find(
          t => t.type === 'income' && t.sourceId === income.id
        );
        
        // Only include if no matching transaction exists
        if (!existingTransaction) {
          return {
            id: -income.id, // Temporary negative ID to avoid collisions
            userId: income.userId,
            type: 'income',
            sourceId: income.id,
            destinationId: null,
            amount: income.amount,
            description: income.name,
            date: income.date,
            category: income.category,
          } as Transaction;
        }
        return null;
      })
      .filter(Boolean) as Transaction[];
    
    // Get expenses for this month and convert to transaction format
    const expenseTransactions = Array.from(this.expenses.values())
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expense.userId === userId && 
               expenseDate >= startDate && 
               expenseDate <= endDate;
      })
      .map(expense => {
        // Check if this expense already has a transaction record
        const existingTransaction = existingTransactions.find(
          t => t.type === 'expense' && t.sourceId === expense.id
        );
        
        // Only include if no matching transaction exists
        if (!existingTransaction) {
          return {
            id: -expense.id - 1000000, // Temporary negative ID to avoid collisions
            userId: expense.userId,
            type: 'expense',
            sourceId: expense.id,
            destinationId: null,
            amount: expense.amount,
            description: expense.name,
            date: expense.date,
            category: expense.category,
          } as Transaction;
        }
        return null;
      })
      .filter(Boolean) as Transaction[];
    
    // Get bills due this month that are paid and convert to transaction format
    const billTransactions = Array.from(this.bills.values())
      .filter(bill => {
        const billDate = new Date(bill.dueDate);
        return bill.userId === userId && 
               billDate >= startDate && 
               billDate <= endDate &&
               bill.isPaid === true;
      })
      .map(bill => {
        // Check if this bill already has a transaction record
        const existingTransaction = existingTransactions.find(
          t => t.type === 'expense' && t.sourceId === bill.id && t.category === 'bill'
        );
        
        // Only include if no matching transaction exists
        if (!existingTransaction) {
          return {
            id: -bill.id - 2000000, // Temporary negative ID to avoid collisions
            userId: bill.userId,
            type: 'expense',
            sourceId: bill.id,
            destinationId: null,
            amount: bill.amount,
            description: bill.name,
            date: bill.dueDate, // Use due date as transaction date for paid bills
            category: 'bill',
          } as Transaction;
        }
        return null;
      })
      .filter(Boolean) as Transaction[];
    
    // Get debt payments this month and convert to transaction format
    const debtTransactions = Array.from(this.debts.values())
      .filter(debt => {
        // Use debt that has a monthly payment, assuming it was paid this month
        return debt.userId === userId && 
               debt.monthlyPayment !== null && 
               debt.monthlyPayment > 0;
      })
      .map(debt => {
        // Create a transaction for this month's debt payment
        // Using the 15th of the month as an assumed payment date if no specific date
        const paymentDate = new Date(year, month - 1, 15);
        
        // Check if this debt already has a transaction record for this month
        const existingTransaction = existingTransactions.find(
          t => t.type === 'expense' && 
               t.sourceId === debt.id && 
               t.category === 'debt payment' &&
               new Date(t.date).getMonth() === month - 1 &&
               new Date(t.date).getFullYear() === year
        );
        
        // Only include if no matching transaction exists
        if (!existingTransaction && debt.monthlyPayment) {
          return {
            id: -debt.id - 3000000, // Temporary negative ID to avoid collisions
            userId: debt.userId,
            type: 'expense',
            sourceId: debt.id,
            destinationId: null,
            amount: debt.monthlyPayment,
            description: `${debt.name} Payment`,
            date: paymentDate,
            category: 'debt payment',
          } as Transaction;
        }
        return null;
      })
      .filter(Boolean) as Transaction[];
    
    // Combine all transactions and sort by date (newest first)
    const allTransactions = [
      ...existingTransactions,
      ...incomeTransactions,
      ...expenseTransactions,
      ...billTransactions,
      ...debtTransactions
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return allTransactions;
  }

  async clearAllData(userId: number): Promise<boolean> {
    try {
      // Delete all transactions for this user
      const transactionIdsToDelete: number[] = [];
      this.transactions.forEach((transaction, id) => {
        if (transaction.userId === userId) {
          transactionIdsToDelete.push(id);
        }
      });
      transactionIdsToDelete.forEach(id => this.transactions.delete(id));
      
      // Delete all incomes for this user
      const incomeIdsToDelete: number[] = [];
      this.incomes.forEach((income, id) => {
        if (income.userId === userId) {
          incomeIdsToDelete.push(id);
        }
      });
      incomeIdsToDelete.forEach(id => this.incomes.delete(id));
      
      // Delete all expenses for this user
      const expenseIdsToDelete: number[] = [];
      this.expenses.forEach((expense, id) => {
        if (expense.userId === userId) {
          expenseIdsToDelete.push(id);
        }
      });
      expenseIdsToDelete.forEach(id => this.expenses.delete(id));
      
      // Delete all savings for this user
      const savingIdsToDelete: number[] = [];
      this.savings.forEach((saving, id) => {
        if (saving.userId === userId) {
          savingIdsToDelete.push(id);
        }
      });
      savingIdsToDelete.forEach(id => this.savings.delete(id));
      
      // Delete all vault goals for this user
      const vaultGoalIdsToDelete: number[] = [];
      this.vaultGoals.forEach((goal, id) => {
        if (goal.userId === userId) {
          vaultGoalIdsToDelete.push(id);
        }
      });
      vaultGoalIdsToDelete.forEach(id => this.vaultGoals.delete(id));
      
      // Delete all debts for this user
      const debtIdsToDelete: number[] = [];
      this.debts.forEach((debt, id) => {
        if (debt.userId === userId) {
          debtIdsToDelete.push(id);
        }
      });
      debtIdsToDelete.forEach(id => this.debts.delete(id));
      
      // Delete all bills for this user
      const billIdsToDelete: number[] = [];
      this.bills.forEach((bill, id) => {
        if (bill.userId === userId) {
          billIdsToDelete.push(id);
        }
      });
      billIdsToDelete.forEach(id => this.bills.delete(id));
      
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }
}

// Create a DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // Helper function to log errors and debug information
  private logDebug(operation: string, data?: any) {
    console.log(`[DatabaseStorage] ${operation}${data ? ': ' + JSON.stringify(data) : ''}`);
  }
  
  private logError(operation: string, error: any) {
    console.error(`[DatabaseStorage Error] ${operation}:`, error);
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Income operations
  async getIncomes(userId: number): Promise<Income[]> {
    return db.select().from(incomes).where(eq(incomes.userId, userId));
  }

  async getIncomeById(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
    const [income] = await db.insert(incomes).values(insertIncome).returning();
    
    // Create a transaction record for this income
    await this.createTransaction({
      userId: income.userId,
      type: "income",
      amount: income.amount,
      description: income.name,
      date: income.date,
      category: income.category,
      sourceId: income.id,
      destinationId: null
    });
    
    return income;
  }

  async updateIncome(id: number, incomeUpdate: Partial<InsertIncome>): Promise<Income | undefined> {
    const [updatedIncome] = await db
      .update(incomes)
      .set(incomeUpdate)
      .where(eq(incomes.id, id))
      .returning();
    return updatedIncome;
  }

  async deleteIncome(id: number): Promise<boolean> {
    try {
      // Get the income to verify it exists and get its information
      const [income] = await db
        .select()
        .from(incomes)
        .where(eq(incomes.id, id));
        
      if (!income) {
        return false;
      }
      
      // Execute in a transaction to ensure both deletes work together
      await db.transaction(async (tx) => {
        // Delete any related transactions with this income ID as sourceId
        await tx
          .delete(transactions)
          .where(
            and(
              eq(transactions.type, 'income'),
              eq(transactions.sourceId, id)
            )
          );
          
        // Delete the income entry
        await tx
          .delete(incomes)
          .where(eq(incomes.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting income:", error);
      return false;
    }
  }

  async getMonthlyIncome(userId: number, month: number, year: number): Promise<Income[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return db
      .select()
      .from(incomes)
      .where(
        and(
          eq(incomes.userId, userId),
          gte(incomes.date, startDate),
          lte(incomes.date, endDate)
        )
      );
  }

  async getTotalIncome(userId: number, month: number, year: number): Promise<number> {
    const monthlyIncomes = await this.getMonthlyIncome(userId, month, year);
    return monthlyIncomes.reduce((total, income) => total + income.amount, 0);
  }

  // Expenses operations
  async getExpenses(userId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    
    // Create a transaction record for this expense
    await this.createTransaction({
      userId: expense.userId,
      type: "expense",
      amount: expense.amount,
      description: expense.name,
      date: expense.date,
      category: expense.category,
      sourceId: expense.id,
      destinationId: null
    });
    
    return expense;
  }

  async updateExpense(id: number, expenseUpdate: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updatedExpense] = await db
      .update(expenses)
      .set(expenseUpdate)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    try {
      // Get the expense to verify it exists and get its information
      const [expense] = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, id));
        
      if (!expense) {
        return false;
      }
      
      // Execute in a transaction to ensure both deletes work together
      await db.transaction(async (tx) => {
        // Delete any related transactions with this expense ID as sourceId
        await tx
          .delete(transactions)
          .where(
            and(
              eq(transactions.type, 'expense'),
              eq(transactions.sourceId, id)
            )
          );
          
        // Delete the expense entry
        await tx
          .delete(expenses)
          .where(eq(expenses.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting expense:", error);
      return false;
    }
  }

  async getMonthlyExpenses(userId: number, month: number, year: number): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      );
  }

  async getTotalExpenses(userId: number, month: number, year: number): Promise<number> {
    const monthlyExpenses = await this.getMonthlyExpenses(userId, month, year);
    return monthlyExpenses.reduce((total, expense) => total + expense.amount, 0);
  }

  // Savings operations
  async getSavings(userId: number): Promise<Saving[]> {
    return db.select().from(savings).where(eq(savings.userId, userId));
  }

  async getSavingById(id: number): Promise<Saving | undefined> {
    const [saving] = await db.select().from(savings).where(eq(savings.id, id));
    return saving;
  }

  async createSaving(insertSaving: InsertSaving): Promise<Saving> {
    const [saving] = await db.insert(savings).values(insertSaving).returning();
    return saving;
  }

  async updateSaving(id: number, savingUpdate: Partial<InsertSaving>): Promise<Saving | undefined> {
    const [updatedSaving] = await db
      .update(savings)
      .set(savingUpdate)
      .where(eq(savings.id, id))
      .returning();
    return updatedSaving;
  }

  async deleteSaving(id: number): Promise<boolean> {
    try {
      // Get the saving to verify it exists and get its information
      const [saving] = await db
        .select()
        .from(savings)
        .where(eq(savings.id, id));
        
      if (!saving) {
        return false;
      }
      
      // Execute in a transaction to ensure both deletes work together
      await db.transaction(async (tx) => {
        // Delete any related transactions with this saving ID as sourceId
        await tx
          .delete(transactions)
          .where(
            and(
              eq(transactions.type, 'saving'),
              eq(transactions.sourceId, id)
            )
          );
          
        // Delete the saving entry
        await tx
          .delete(savings)
          .where(eq(savings.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting saving:", error);
      return false;
    }
  }

  async getMonthlySavings(userId: number, month: string, year: number): Promise<Saving | undefined> {
    const [saving] = await db
      .select()
      .from(savings)
      .where(
        and(
          eq(savings.userId, userId),
          eq(savings.month, month),
          eq(savings.year, year)
        )
      );
    return saving;
  }

  async getYearlySavings(userId: number, year: number): Promise<Saving[]> {
    return db
      .select()
      .from(savings)
      .where(
        and(
          eq(savings.userId, userId),
          eq(savings.year, year)
        )
      );
  }

  // Vault Goals operations
  async getVaultGoals(userId: number): Promise<VaultGoal[]> {
    return db.select().from(vaultGoals).where(eq(vaultGoals.userId, userId));
  }

  async getVaultGoalById(id: number): Promise<VaultGoal | undefined> {
    const [goal] = await db.select().from(vaultGoals).where(eq(vaultGoals.id, id));
    return goal;
  }

  async createVaultGoal(insertGoal: InsertVaultGoal): Promise<VaultGoal> {
    const [goal] = await db.insert(vaultGoals).values(insertGoal).returning();
    return goal;
  }

  async updateVaultGoal(id: number, goalUpdate: Partial<InsertVaultGoal>): Promise<VaultGoal | undefined> {
    const [updatedGoal] = await db
      .update(vaultGoals)
      .set(goalUpdate)
      .where(eq(vaultGoals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteVaultGoal(id: number): Promise<boolean> {
    const [deletedGoal] = await db
      .delete(vaultGoals)
      .where(eq(vaultGoals.id, id))
      .returning();
    return !!deletedGoal;
  }

  async addFundsToGoal(id: number, amount: number): Promise<VaultGoal | undefined> {
    const goal = await this.getVaultGoalById(id);
    if (!goal) return undefined;
    
    const updatedGoal = await this.updateVaultGoal(id, {
      currentAmount: (goal.currentAmount || 0) + amount,
    });
    
    return updatedGoal;
  }

  async withdrawFundsFromGoal(id: number, amount: number): Promise<VaultGoal | undefined> {
    const goal = await this.getVaultGoalById(id);
    if (!goal) return undefined;
    
    const currentAmount = goal.currentAmount || 0;
    if (currentAmount < amount) return undefined;
    
    const updatedGoal = await this.updateVaultGoal(id, {
      currentAmount: currentAmount - amount,
    });
    
    return updatedGoal;
  }

  // Debts operations
  async getDebts(userId: number): Promise<Debt[]> {
    return db.select().from(debts).where(eq(debts.userId, userId));
  }

  async getDebtById(id: number): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt;
  }

  async createDebt(insertDebt: InsertDebt): Promise<Debt> {
    const [debt] = await db.insert(debts).values(insertDebt).returning();
    
    // Create a transaction record for this debt
    await this.createTransaction({
      userId: debt.userId,
      type: "debt",
      amount: debt.totalAmount,
      description: debt.name,
      date: new Date(),
      category: debt.category || null,
      sourceId: debt.id,
      destinationId: null
    });
    
    return debt;
  }

  async updateDebt(id: number, debtUpdate: Partial<InsertDebt>): Promise<Debt | undefined> {
    const [updatedDebt] = await db
      .update(debts)
      .set(debtUpdate)
      .where(eq(debts.id, id))
      .returning();
    return updatedDebt;
  }

  async deleteDebt(id: number): Promise<boolean> {
    try {
      // Get the debt to verify it exists and get its information
      const [debt] = await db
        .select()
        .from(debts)
        .where(eq(debts.id, id));
        
      if (!debt) {
        return false;
      }
      
      // Execute in a transaction to ensure both deletes work together
      await db.transaction(async (tx) => {
        // Delete any related transactions with this debt ID as sourceId
        await tx
          .delete(transactions)
          .where(
            and(
              eq(transactions.type, 'debt'),
              eq(transactions.sourceId, id)
            )
          );
          
        // Delete the debt entry
        await tx
          .delete(debts)
          .where(eq(debts.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting debt:", error);
      return false;
    }
  }

  async getDebtsByOwnership(userId: number, isOwedByUser: boolean): Promise<Debt[]> {
    return db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.isOwedByUser, isOwedByUser)
        )
      );
  }

  async getTotalDebts(userId: number, isOwedByUser: boolean): Promise<number> {
    const debts = await this.getDebtsByOwnership(userId, isOwedByUser);
    return debts.reduce((total, debt) => total + debt.remainingAmount, 0);
  }

  // Bills operations
  async getBills(userId: number): Promise<Bill[]> {
    return db.select().from(bills).where(eq(bills.userId, userId));
  }

  async getBillById(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const [bill] = await db.insert(bills).values(insertBill).returning();
    
    // Create a transaction record for this bill
    await this.createTransaction({
      userId: bill.userId,
      type: "bill",
      amount: bill.amount,
      description: bill.name,
      date: bill.dueDate,
      category: bill.category,
      sourceId: bill.id,
      destinationId: null
    });
    
    return bill;
  }

  async updateBill(id: number, billUpdate: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updatedBill] = await db
      .update(bills)
      .set(billUpdate)
      .where(eq(bills.id, id))
      .returning();
    return updatedBill;
  }

  async deleteBill(id: number): Promise<boolean> {
    try {
      // Get the bill to verify it exists and get its information
      const [bill] = await db
        .select()
        .from(bills)
        .where(eq(bills.id, id));
        
      if (!bill) {
        return false;
      }
      
      // Execute in a transaction to ensure both deletes work together
      await db.transaction(async (tx) => {
        // Delete any related transactions with this bill ID as sourceId
        await tx
          .delete(transactions)
          .where(
            and(
              eq(transactions.type, 'bill'),
              eq(transactions.sourceId, id)
            )
          );
          
        // Delete the bill entry
        await tx
          .delete(bills)
          .where(eq(bills.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting bill:", error);
      return false;
    }
  }

  async getUpcomingBills(userId: number, daysAhead: number): Promise<Bill[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + daysAhead);
    
    return db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.isPaid, false),
          gte(bills.dueDate, now),
          lte(bills.dueDate, future)
        )
      )
      .orderBy(bills.dueDate);
  }

  async markBillAsPaid(id: number): Promise<Bill | undefined> {
    return this.updateBill(id, { isPaid: true });
  }

  async getUnpaidBills(userId: number): Promise<Bill[]> {
    return db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.isPaid, false)
        )
      )
      .orderBy(bills.dueDate);
  }
  
  async getBillsForMonth(userId: number, month: number, year: number): Promise<Bill[]> {
    // Create date range for the specified month
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          gte(bills.dueDate, startDate),
          lte(bills.dueDate, endDate)
        )
      )
      .orderBy(asc(bills.dueDate));
  }

  // Transactions operations
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getRecentTransactions(userId: number, limit: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getMonthlyTransactions(userId: number, month: number, year: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
  }

  // Enhanced clearAllData method for thorough data cleaning
  async clearAllData(userId: number): Promise<boolean> {
    try {
      console.log(`Starting clearAllData for user ${userId}`);
      
      // First verify what data exists for this user
      const incomeCount = await db
        .select({ count: count() })
        .from(incomes)
        .where(eq(incomes.userId, userId));
      
      const expenseCount = await db
        .select({ count: count() })
        .from(expenses)
        .where(eq(expenses.userId, userId));
      
      const savingsCount = await db
        .select({ count: count() })
        .from(savings)
        .where(eq(savings.userId, userId));
      
      const goalsCount = await db
        .select({ count: count() })
        .from(vaultGoals)
        .where(eq(vaultGoals.userId, userId));
      
      const debtsCount = await db
        .select({ count: count() })
        .from(debts)
        .where(eq(debts.userId, userId));
      
      const billsCount = await db
        .select({ count: count() })
        .from(bills)
        .where(eq(bills.userId, userId));
      
      const transactionsCount = await db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId));
      
      console.log(`Before deletion - Counts for user ${userId}:
        Incomes: ${incomeCount[0]?.count || 0}
        Expenses: ${expenseCount[0]?.count || 0}
        Savings: ${savingsCount[0]?.count || 0}
        Goals: ${goalsCount[0]?.count || 0}
        Debts: ${debtsCount[0]?.count || 0}
        Bills: ${billsCount[0]?.count || 0}
        Transactions: ${transactionsCount[0]?.count || 0}
      `);
      
      // Delete all user data in a transaction
      // Starting with transactions first to avoid foreign key issues
      await db.transaction(async (tx) => {
        // Delete in specific order to prevent constraint issues
        console.log(`Deleting transactions for user ${userId}`);
        await tx.delete(transactions).where(eq(transactions.userId, userId));
        
        console.log(`Deleting incomes for user ${userId}`);
        await tx.delete(incomes).where(eq(incomes.userId, userId));
        
        console.log(`Deleting expenses for user ${userId}`);
        await tx.delete(expenses).where(eq(expenses.userId, userId));
        
        console.log(`Deleting savings for user ${userId}`);
        await tx.delete(savings).where(eq(savings.userId, userId));
        
        console.log(`Deleting vault goals for user ${userId}`);
        await tx.delete(vaultGoals).where(eq(vaultGoals.userId, userId));
        
        console.log(`Deleting debts for user ${userId}`);
        await tx.delete(debts).where(eq(debts.userId, userId));
        
        console.log(`Deleting bills for user ${userId}`);
        await tx.delete(bills).where(eq(bills.userId, userId));
      });
      
      // Verify deletion was successful
      const afterIncomeCount = await db
        .select({ count: count() })
        .from(incomes)
        .where(eq(incomes.userId, userId));
      
      const afterTransactionsCount = await db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId));
      
      const afterGoalsCount = await db
        .select({ count: count() })
        .from(vaultGoals)
        .where(eq(vaultGoals.userId, userId));
      
      console.log(`After deletion - Counts for user ${userId}:
        Incomes: ${afterIncomeCount[0]?.count || 0}
        Transactions: ${afterTransactionsCount[0]?.count || 0}
        Goals: ${afterGoalsCount[0]?.count || 0}
      `);
      
      return true;
    } catch (error) {
      console.error("Error clearing user data:", error);
      return false;
    }
  }
}

// Use Database storage instead of memory storage
export const storage = new DatabaseStorage();
