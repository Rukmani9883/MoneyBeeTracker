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

  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getRecentTransactions(userId: number, limit: number): Promise<Transaction[]>;
  getMonthlyTransactions(userId: number, month: number, year: number): Promise<Transaction[]>;
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
    return this.incomes.delete(id);
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
    return Array.from(this.transactions.values())
      .filter(transaction => {
        const date = new Date(transaction.date);
        return transaction.userId === userId && 
               date.getMonth() === month && 
               date.getFullYear() === year;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const storage = new MemStorage();
