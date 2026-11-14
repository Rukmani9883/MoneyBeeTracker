import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertIncomeSchema,
  insertExpenseSchema,
  insertSavingsSchema,
  insertVaultGoalSchema,
  insertDebtSchema,
  insertBillSchema,
  insertTransactionSchema
} from "@shared/schema";
import { formatISO } from "date-fns";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool, db } from './db';
import { sql } from 'drizzle-orm';

// Extend Express Request type to include our session data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log("Authentication check - User ID:", req.session?.userId);
  
  if (req.session && req.session.userId) {
    console.log("User authenticated:", req.session.userId);
    next();
  } else {
    console.log("Authentication failed - no valid session");
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  console.log("Setting up session middleware");
  
  // Ensure the session table exists
  try {
    // Connect to the existing sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    console.log("Session table created/verified");
    
    // Check if there's any data in the sessions table
    const result = await db.execute(sql`SELECT COUNT(*) FROM sessions`);
    console.log("Current session count:", result.rows?.[0]?.count || 0);
  } catch (err) {
    console.error("Error verifying session table:", err);
  }
  
  const PgSession = connectPgSimple(session);
  app.set("trust proxy", 1);
  const sessionStore = new PgSession({
    pool,
    tableName: 'sessions', // Use the existing sessions table
    createTableIfMissing: true,
  });
  
  app.use(
    session({
      store: sessionStore,
      name: 'connect.sid', // Use the default Express session cookie name for consistency
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production", // Set to false for development since we're not using HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      },
      rolling: true, // Resets cookie expiration on each request
    })
  );
  

  // prefix all routes with /api
  const api = "/api";

  // All financial endpoints require a valid session and must only access its records.
  // This guard is registered before every financial route.
  const financialResources = new Set([
    'incomes', 'expenses', 'savings', 'vault-goals', 'debts', 'bills',
    'transactions', 'dashboard', 'demo-data', 'auto-allocate-savings', 'reset-data'
  ]);
  const recordLoaders: Record<string, (id: number) => Promise<{ userId: number } | undefined>> = {
    incomes: (id) => storage.getIncomeById(id),
    expenses: (id) => storage.getExpenseById(id),
    savings: (id) => storage.getSavingById(id),
    'vault-goals': (id) => storage.getVaultGoalById(id),
    debts: (id) => storage.getDebtById(id),
    bills: (id) => storage.getBillById(id),
    transactions: (id) => storage.getTransactionById(id),
  };
  app.use(api, async (req: Request, res: Response, next: NextFunction) => {
    const [resource, recordId] = req.path.split('/').filter(Boolean);
    if (!financialResources.has(resource)) return next();
    if (!req.session?.userId) return res.status(401).json({ message: 'Unauthorized' });

    // Prevent clients from changing the ownership of existing records.
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      req.body.userId = req.session.userId;
    }
    // Some older frontend requests still include userId as a query parameter.
    // The handlers use the session ID instead, so the query value is ignored.
    if (recordId && /^\d+$/.test(recordId) && recordLoaders[resource]) {
      try {
        const record = await recordLoaders[resource](Number(recordId));
        if (!record || record.userId !== req.session.userId) {
          return res.status(404).json({ message: 'Record not found' });
        }
      } catch (error) {
        console.error('Record authorization failed:', error);
        return res.status(500).json({ message: 'Unable to verify record ownership' });
      }
    }
    next();
  });

  // User routes
  app.post(`${api}/auth/register`, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/auth/login`, async (req: Request, res: Response) => {
    try {
      console.log("Login attempt with username:", req.body.username);
      
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log("User found:", user.id, user.username);
      
      // Compare hashed password
      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.log("Invalid password for user:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user in session
      req.session.userId = user.id;
      console.log("Setting session user ID:", user.id);
      
      // Save session explicitly to ensure it's stored before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        // Don't return password in response
        const { password: userPassword, ...userWithoutPassword } = user;
        
        // Check our session data again after save
        console.log("After save - User ID in session:", req.session.userId);
        
        console.log("Login successful for user:", username);
        
        res.status(200).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });
  
  app.get(`${api}/auth/user`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Get user profile - User ID from session:", req.session.userId);
      
      const userId = req.session.userId;
      if (!userId) {
        console.log("No user ID in session");
        return res.status(401).json({ message: "No user associated with this session" });
      }
      
      console.log("Retrieving user with ID:", userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log("User not found in database:", userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("User found:", user.id, user.username);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error retrieving user profile:", error);
      res.status(400).json({ message: error.message || "Error retrieving user" });
    }
  });
  
  app.post(`${api}/auth/logout`, (req: Request, res: Response) => {
    console.log("Logout request");
    if (req.session) {

      
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        
        // Clear the cookie using the same name set in the session config
        res.clearCookie('connect.sid');
        console.log("Logout successful, cookie cleared");
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      console.log("No session to destroy");
      res.status(200).json({ message: "Already logged out" });
    }
  });
  
  // Enhanced reset data route with improved logging and error handling
  app.post(`${api}/reset-data`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      console.log(`Attempting to reset all data for user ID: ${userId}`);
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`Reset data failed: User ID ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      // First check if there is data to delete
      const beforeIncomes = await storage.getIncomes(userId);
      const beforeExpenses = await storage.getExpenses(userId);
      const beforeGoals = await storage.getVaultGoals(userId);
      const beforeTransactions = await storage.getRecentTransactions(userId, 1000);
      
      console.log(`Before reset - Data counts for user ${userId}:
        Incomes: ${beforeIncomes.length}
        Expenses: ${beforeExpenses.length}
        Goals: ${beforeGoals.length}
        Transactions: ${beforeTransactions.length}
      `);
      
      // Perform the reset operation
      const success = await storage.clearAllData(userId);
      
      if (success) {
        // Verify data was actually cleared
        const afterIncomes = await storage.getIncomes(userId);
        const afterExpenses = await storage.getExpenses(userId);
        const afterGoals = await storage.getVaultGoals(userId);
        const afterTransactions = await storage.getRecentTransactions(userId, 1000);
        
        console.log(`After reset - Data counts for user ${userId}:
          Incomes: ${afterIncomes.length}
          Expenses: ${afterExpenses.length}
          Goals: ${afterGoals.length}
          Transactions: ${afterTransactions.length}
        `);
        
        // Confirm all data is actually cleared
        if (afterIncomes.length === 0 && 
            afterExpenses.length === 0 && 
            afterGoals.length === 0 && 
            afterTransactions.length === 0) {
          console.log(`All data successfully cleared for user ${userId}`);
          return res.status(200).json({ message: "All data has been reset successfully" });
        } else {
          console.error(`Reset data partially failed for user ${userId}: Some data remains`);
          return res.status(500).json({ message: "Data reset partially completed. Some data may still be present." });
        }
      } else {
        console.error(`Reset data failed for user ${userId}: clearAllData returned false`);
        return res.status(500).json({ message: "Failed to reset data" });
      }
    } catch (error) {
      console.error(`Error in reset-data endpoint:`, error);
      return res.status(500).json({ message: "An error occurred while resetting data" });
    }
  });

  // Income routes
  app.get(`${api}/incomes`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if month and year are provided for filtering
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      
      let incomes;
      
      if (month !== undefined && year !== undefined && !isNaN(month) && !isNaN(year)) {
        // Filter incomes by month and year
        incomes = await storage.getMonthlyIncome(userId, month, year);
      } else {
        // Get all incomes if no date filter
        incomes = await storage.getIncomes(userId);
      }
      
      res.status(200).json(incomes);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/incomes`, async (req: Request, res: Response) => {
    try {
      const incomeData = insertIncomeSchema.parse({ ...req.body, userId: req.session.userId! });
      const income = await storage.createIncome(incomeData);
      res.status(201).json(income);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/incomes/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      
      if (isNaN(userId) || isNaN(month) || isNaN(year)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const incomes = await storage.getMonthlyIncome(userId, month, year);
      const total = await storage.getTotalIncome(userId, month, year);
      
      res.status(200).json({ incomes, total });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/incomes/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const income = await storage.getIncomeById(id);
      
      if (!income) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      res.status(200).json(income);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/incomes/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...incomeData } = req.body;
      
      // Convert date string to Date object if present
      if (incomeData.date && typeof incomeData.date === 'string') {
        incomeData.date = new Date(incomeData.date);
      }
      
      const updatedIncome = await storage.updateIncome(id, incomeData);
      
      if (!updatedIncome) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      res.status(200).json(updatedIncome);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`${api}/incomes/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteIncome(id);
      
      if (!success) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });



  // Expense routes
  app.get(`${api}/expenses`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if month and year are provided for filtering
      // Note: Frontend sends 1-based month, but JS Date uses 0-based month
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) - 1 : undefined;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      
      let expenses;
      
      try {
        // Get all expenses first
        expenses = await storage.getExpenses(userId);
        
        // If month and year are provided, filter the expenses
        if (month !== undefined && year !== undefined && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12) {
          console.log(`Filtering expenses for month ${month + 1} and year ${year}`);
          
          // Filter expenses by date in the specified month and year
          expenses = expenses.filter(expense => {
            if (!expense.date) return false;
            
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
          });
        }
        
        return res.status(200).json(expenses);
      } catch (err: any) {
        console.error("Error processing expenses:", err);
        return res.status(200).json([]); // Return empty array on error
      }
    } catch (error: any) {
      console.error("Error in expenses endpoint:", error);
      res.status(400).json({ message: error.message || "Error retrieving expenses" });
    }
  });

  app.post(`${api}/expenses`, async (req: Request, res: Response) => {
    try {
      const expenseData = insertExpenseSchema.parse({ ...req.body, userId: req.session.userId! });
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/expenses/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      
      if (isNaN(userId) || isNaN(month) || isNaN(year)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const expenses = await storage.getMonthlyExpenses(userId, month, year);
      const total = await storage.getTotalExpenses(userId, month, year);
      
      res.status(200).json({ expenses, total });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/expenses/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(200).json(expense);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/expenses/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...expenseData } = req.body;
      const updatedExpense = await storage.updateExpense(id, expenseData);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(200).json(updatedExpense);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`${api}/expenses/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExpense(id);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });



  // Savings routes
  app.get(`${api}/savings`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if month and year are provided for filtering
      // Convert to 0-based month if provided, or use -1 as a sentinel
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) - 1 : -1;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      
      let savings;
      
      // If both month and year are valid
      if (month >= 0 && month < 12 && year !== undefined && !isNaN(year)) {
        // Get the month name for filtering
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];
        
        // Filter savings by month and year
        savings = await storage.getSavings(userId);
        
        // Debug what's being filtered
        console.log("Filtering savings: looking for", monthNames[month], year);
        console.log("Available savings:", savings.map(s => ({ month: s.month, year: s.year })));
        
        savings = savings.filter(saving => 
          saving.month === monthNames[month] && saving.year === year
        );
      } else {
        // Get all savings if no date filter
        savings = await storage.getSavings(userId);
      }
      
      res.status(200).json(savings);
    } catch (error: any) {
      console.error("Error fetching savings:", error);
      res.status(400).json({ message: error.message || "Error fetching savings data" });
    }
  });

  app.post(`${api}/savings`, async (req: Request, res: Response) => {
    try {
      const savingData = insertSavingsSchema.parse({ ...req.body, userId: req.session.userId! });
      const saving = await storage.createSaving(savingData);
      res.status(201).json(saving);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/savings/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const month = req.query.month as string;
      const year = parseInt(req.query.year as string);
      
      if (isNaN(userId) || !month || isNaN(year)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const saving = await storage.getMonthlySavings(userId, month, year);
      
      if (!saving) {
        return res.status(404).json({ message: "Savings not found for this month" });
      }
      
      res.status(200).json(saving);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/savings/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...savingData } = req.body;
      const updatedSaving = await storage.updateSaving(id, savingData);
      
      if (!updatedSaving) {
        return res.status(404).json({ message: "Saving not found" });
      }
      
      res.status(200).json(updatedSaving);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Vault Goals routes
  app.get(`${api}/vault-goals`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const goals = await storage.getVaultGoals(userId);
      res.status(200).json(goals);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/vault-goals`, async (req: Request, res: Response) => {
    try {
      const goalData = insertVaultGoalSchema.parse({ ...req.body, userId: req.session.userId! });
      const goal = await storage.createVaultGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/vault-goals/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const goal = await storage.getVaultGoalById(id);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.status(200).json(goal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/vault-goals/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...goalData } = req.body;
      const updatedGoal = await storage.updateVaultGoal(id, goalData);
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.status(200).json(updatedGoal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`${api}/vault-goals/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVaultGoal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/vault-goals/:id/add-funds`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { amount } = req.body;
      
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const updatedGoal = await storage.addFundsToGoal(id, amount);
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.status(200).json(updatedGoal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/vault-goals/:id/withdraw-funds`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { amount } = req.body;
      
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const updatedGoal = await storage.withdrawFundsFromGoal(id, amount);
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Goal not found or insufficient funds" });
      }
      
      res.status(200).json(updatedGoal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Auto-allocate savings to vault goals based on proportional distribution
  app.post(`${api}/auto-allocate-savings`, async (req: Request, res: Response) => {
    try {
      const { amount, month, year } = req.body;
      const userId = req.session.userId!;
      
      if (!userId || !amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Missing or invalid parameters" });
      }
      
      // Get all active vault goals
      const goals = await storage.getVaultGoals(userId);
      
      if (!goals || goals.length === 0) {
        return res.status(200).json({ 
          message: "No goals available for allocation", 
          allocated: false 
        });
      }
      
      // Calculate total target amount across all incomplete goals
      const incompleteGoals = goals.filter(goal => {
        const currentAmount = goal.currentAmount || 0;
        return currentAmount < goal.targetAmount;
      });
      
      if (incompleteGoals.length === 0) {
        return res.status(200).json({ 
          message: "All goals are already complete", 
          allocated: false 
        });
      }
      
      // Calculate total remaining amount needed across all incomplete goals
      const totalRemainingAmount = incompleteGoals.reduce((total, goal) => {
        return total + (goal.targetAmount - (goal.currentAmount || 0));
      }, 0);
      
      console.log(`Auto-allocating ₹${amount} to ${incompleteGoals.length} goals. Total needed: ₹${totalRemainingAmount}`);
      
      // Allocate savings proportionally to each goal based on remaining amount needed
      const allocations = [];
      let remainingAllocation = amount;
      
      for (const goal of incompleteGoals) {
        // Calculate remaining needed for this goal
        const currentAmount = goal.currentAmount || 0;
        const remainingNeeded = goal.targetAmount - currentAmount;
        
        // Calculate proportion based on remaining amount needed
        const proportion = remainingNeeded / totalRemainingAmount;
        
        // Calculate allocation amount (rounded to nearest integer)
        let allocation = Math.min(remainingAllocation, Math.round(amount * proportion));
        
        // Ensure we don't exceed the goal target
        allocation = Math.min(allocation, remainingNeeded);
        
        if (allocation > 0) {
          // Update the goal with the allocated amount
          const newAmount = currentAmount + allocation;
          await storage.updateVaultGoal(goal.id, {
            currentAmount: newAmount
          });
          
          // Create a transaction record for this allocation
          await storage.createTransaction({
            userId,
            type: "transfer",
            amount: allocation,
            description: `Auto-allocation to ${goal.name}`,
            category: "Savings",
            date: new Date()
          });
          
          // Record the allocation
          allocations.push({
            goalId: goal.id,
            goalName: goal.name,
            allocatedAmount: allocation,
            newTotal: newAmount,
            targetAmount: goal.targetAmount,
            percentage: Math.round((newAmount / goal.targetAmount) * 100)
          });
          
          remainingAllocation -= allocation;
        }
        
        // If we've allocated all available funds, stop
        if (remainingAllocation <= 0) break;
      }
      
      // If there's still money left and we have goals, allocate the rest to the first goal
      if (remainingAllocation > 0 && incompleteGoals.length > 0) {
        const firstGoal = incompleteGoals[0];
        const remainingNeeded = firstGoal.targetAmount - (firstGoal.currentAmount || 0);
        
        // Only allocate if there's still room in the goal
        if (remainingNeeded > 0) {
          const additionalAmount = Math.min(remainingAllocation, remainingNeeded);
          const newAmount = (firstGoal.currentAmount || 0) + additionalAmount;
          
          // Update the goal
          await storage.updateVaultGoal(firstGoal.id, {
            currentAmount: newAmount
          });
          
          // Update the existing allocation or add a new one
          const existingAllocation = allocations.find(a => a.goalId === firstGoal.id);
          if (existingAllocation) {
            existingAllocation.allocatedAmount += additionalAmount;
            existingAllocation.newTotal = newAmount;
            existingAllocation.percentage = Math.round((newAmount / firstGoal.targetAmount) * 100);
          } else {
            allocations.push({
              goalId: firstGoal.id,
              goalName: firstGoal.name,
              allocatedAmount: additionalAmount,
              newTotal: newAmount,
              targetAmount: firstGoal.targetAmount,
              percentage: Math.round((newAmount / firstGoal.targetAmount) * 100)
            });
          }
          
          // Create another transaction record for this additional allocation
          await storage.createTransaction({
            userId,
            type: "transfer",
            amount: additionalAmount,
            description: `Additional allocation to ${firstGoal.name}`,
            category: "Savings",
            date: new Date()
          });
          
          remainingAllocation -= additionalAmount;
        }
      }
      
      console.log(`Allocation complete. Allocated: ₹${amount - remainingAllocation}, Remaining: ₹${remainingAllocation}`);
      
      // Set header to notify of financial data changes
      res.set('X-Financial-Data-Changed', 'true');
      
      // Return the allocation results
      res.status(200).json({
        allocated: true,
        totalAmount: amount,
        totalAllocated: amount - remainingAllocation,
        allocations,
        remainingUnallocated: remainingAllocation
      });
    } catch (error) {
      console.error("Error auto-allocating savings:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Debt Manager routes
  app.get(`${api}/debts`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const debts = await storage.getDebts(userId);
      res.status(200).json(debts);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/debts/owed-by-user`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const debts = await storage.getOwedByUserDebts(userId);
      const total = await storage.getTotalDebts(userId, true);
      res.status(200).json({ debts, total });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/debts/owed-to-user`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const debts = await storage.getOwedToUserDebts(userId);
      const total = await storage.getTotalDebts(userId, false);
      res.status(200).json({ debts, total });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/debts`, async (req: Request, res: Response) => {
    try {
      const debtData = insertDebtSchema.parse({ ...req.body, userId: req.session.userId! });
      const debt = await storage.createDebt(debtData);
      res.status(201).json(debt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/debts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const debt = await storage.getDebtById(id);
      
      if (!debt) {
        return res.status(404).json({ message: "Debt not found" });
      }
      
      res.status(200).json(debt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/debts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...debtData } = req.body;
      
      // Convert date string to Date object if present
      if (debtData.dueDate && typeof debtData.dueDate === 'string') {
        debtData.dueDate = new Date(debtData.dueDate);
      }
      
      const updatedDebt = await storage.updateDebt(id, debtData);
      
      if (!updatedDebt) {
        return res.status(404).json({ message: "Debt not found" });
      }
      
      res.status(200).json(updatedDebt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`${api}/debts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDebt(id);
      
      if (!success) {
        return res.status(404).json({ message: "Debt not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bills routes
  app.get(`${api}/bills`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if month and year are provided for filtering
      // Note: Frontend sends 1-based month, but JS Date uses 0-based month
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) - 1 : undefined;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      
      let bills;
      
      try {
        // Get all bills first
        bills = await storage.getBills(userId);
        
        // If month and year are provided, filter the bills
        if (month !== undefined && year !== undefined && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12) {
          console.log(`Filtering bills for month ${month + 1} and year ${year}`);
          
          // Filter bills by due date in the specified month and year
          bills = bills.filter(bill => {
            if (!bill.dueDate) return true; // Include bills without due dates
            
            const dueDate = new Date(bill.dueDate);
            return dueDate.getMonth() === month && dueDate.getFullYear() === year;
          });
        }
      } catch (err: any) {
        console.error("Error processing bills:", err);
        bills = []; // Use empty array on error
      }
      
      res.status(200).json(bills);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/bills`, async (req: Request, res: Response) => {
    try {
      const billData = insertBillSchema.parse({ ...req.body, userId: req.session.userId! });
      const bill = await storage.createBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/bills/upcoming`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get current date values
      const now = new Date();
      
      // We have verified user is authenticated with isAuthenticated middleware
      const userId = (req.session as any).userId;
      
      // Default to 30 days ahead
      const daysAhead = 30;
      
      console.log(`Fetching upcoming bills for user ${userId} for next ${daysAhead} days`);
      
      // Get all bills for the user
      const allBills = await storage.getBills(userId);
      console.log(`Found ${allBills.length} total bills for user ${userId}`);
      
      if (!allBills || allBills.length === 0) {
        return res.status(200).json([]);
      }
      
      // Calculate future date
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);
      
      // Filter upcoming bills (not paid and due date in the future or today)
      const upcomingBills = allBills.filter(bill => {
        if (!bill.dueDate) return false;
        
        const dueDate = new Date(bill.dueDate);
        // Check if bill is unpaid and due date is between now and future date
        return !bill.isPaid && dueDate >= now && dueDate <= futureDate;
      });
      
      console.log(`Filtered to ${upcomingBills.length} upcoming bills`);
      
      // Sort by due date
      upcomingBills.sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      // Log the upcoming bills for debugging
      upcomingBills.forEach(bill => {
        console.log(`Upcoming bill: ${bill.name}, amount: ${bill.amount}, date: ${bill.dueDate}`);
      });
      
      return res.json(upcomingBills);
    } catch (error) {
      console.error("Error in upcoming bills endpoint:", error);
      return res.status(500).json({ error: "Failed to fetch upcoming bills" });
    }
  });

  app.get(`${api}/bills/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const bill = await storage.getBillById(id);
      
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.status(200).json(bill);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/bills/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId: _ignoredUserId, id: _ignoredId, ...billData } = req.body;
      const updatedBill = await storage.updateBill(id, billData);
      
      if (!updatedBill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.status(200).json(updatedBill);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`${api}/bills/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBill(id);
      
      if (!success) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });



  app.post(`${api}/bills/:id/mark-paid`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedBill = await storage.markBillAsPaid(id);
      
      if (!updatedBill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      res.status(200).json(updatedBill);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Transaction routes
  app.get(`${api}/transactions`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const transactions = await storage.getTransactions(userId);
      res.status(200).json(transactions);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post(`${api}/transactions`, async (req: Request, res: Response) => {
    try {
      const transactionData = insertTransactionSchema.parse({ ...req.body, userId: req.session.userId! });
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/transactions/recent`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 5;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const transactions = await storage.getRecentTransactions(userId, limit);
      res.status(200).json(transactions);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${api}/transactions/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (isNaN(userId) || isNaN(month) || isNaN(year)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const transactions = await storage.getMonthlyTransactions(userId, month, year);
      
      // Apply limit after getting all transactions
      const limitedTransactions = transactions.slice(0, limit);
      
      res.status(200).json(limitedTransactions);
    } catch (error) {
      console.error("Error fetching monthly transactions:", error);
      res.status(400).json({ message: "Error fetching monthly transactions" });
    }
  });

  // Enhanced Dashboard summary route with auto-calculated savings
  app.get(`${api}/dashboard/summary`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get month and year from query params if provided, otherwise use current date
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : new Date().getMonth() + 1; // Add 1 because client expects 1-based months
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      if (isNaN(month) || isNaN(year)) {
        return res.status(400).json({ message: "Invalid month or year" });
      }
      
      console.log(`Getting dashboard summary for user ${userId}, month ${month}, year ${year}`);
      
      // Get total income for current month
      const totalIncome = await storage.getTotalIncome(userId, month, year);
      
      // Get total expenses for current month
      const totalExpenses = await storage.getTotalExpenses(userId, month, year);
      
      // Get bills due this month
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0); // Last day of month
      
      const bills = await storage.getBills(userId);
      const billsDueThisMonth = bills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate >= monthStartDate && dueDate <= monthEndDate;
      });
      
      const billPayments = billsDueThisMonth.reduce((total, bill) => total + bill.amount, 0);
      
      // Calculate remaining savings after expenses and bills
      const totalOutflow = totalExpenses + billPayments;
      const savings = Math.max(0, totalIncome - totalOutflow);
      
      console.log(`Financial summary:
        Total Income: ${totalIncome}
        Total Expenses: ${totalExpenses}
        Bill Payments: ${billPayments}
        Total Outflow: ${totalOutflow}
        Calculated Savings: ${savings}
      `);
      
      // Get all vault goals and sum up current amounts
      const vaultGoals = await storage.getVaultGoals(userId);
      const totalVault = vaultGoals.reduce((total, goal) => total + (goal.currentAmount || 0), 0);
      
      // Get all bills for the user
      const allBills = await storage.getBills(userId);
      
      // Get current date
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 30);
      
      // Filter for upcoming bills (not paid, due date in future)
      const upcomingBills = allBills.filter(bill => {
        if (!bill.dueDate || bill.isPaid) return false;
        const dueDate = new Date(bill.dueDate);
        return dueDate >= now && dueDate <= futureDate;
      }).sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      // Calculate total upcoming bills
      const totalUpcomingBills = upcomingBills.reduce((total, bill) => {
        console.log(`Upcoming bill: ${bill.name}, amount: ${bill.amount}`);
        return total + bill.amount;
      }, 0);
      
      console.log(`Total upcoming bills amount: ${totalUpcomingBills} from ${upcomingBills.length} bills`);
      
      // Get recent transactions
      const recentTransactions = await storage.getRecentTransactions(userId, 5);
      
      // Get total debt information
      const debtsYouOwe = await storage.getOwedByUserDebts(userId);
      const debtsOwedToYou = await storage.getOwedToUserDebts(userId);
      
      // Total debt is the sum of all debts you owe
      const totalDebt = debtsYouOwe.reduce((total, debt) => total + debt.remainingAmount, 0);
      
      console.log(`Total debt: ${totalDebt} from ${debtsYouOwe.length} debts`);
      
      // Auto-update the savings record for this month
      await autoUpdateMonthlySavings(userId, month, year, savings);
      
      // Return all summary data
      res.status(200).json({
        totalIncome,
        totalExpenses,
        billPayments,
        savings,
        totalVault,
        totalUpcomingBills,
        totalDebt,
        upcomingBills,
        recentTransactions,
        vaultGoals
      });
    } catch (error) {
      console.error("Error generating dashboard summary:", error);
      res.status(400).json({ message: error.message });
    }
  });
  
  // Helper function to auto-update savings based on calculated amount
  async function autoUpdateMonthlySavings(userId: number, month: number, year: number, calculatedAmount: number) {
    try {
      // Convert 1-based month to 0-based month for JS Date
      const jsMonth = month - 1;
      
      // Get month name
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[jsMonth];
      
      // Check if a savings record exists for this month
      const existingSavings = await storage.getMonthlySavings(userId, monthName, year);
      
      if (existingSavings) {
        // Update existing record with calculated amount
        const updatedSaving = await storage.updateSaving(existingSavings.id, {
          amount: calculatedAmount,
          // Keep existing goal if present
          goal: existingSavings.goal
        });
        console.log(`Updated savings for ${monthName} ${year} to ${calculatedAmount}`);
        return updatedSaving;
      } else {
        // Create new savings record
        const newSaving = await storage.createSaving({
          userId,
          month: monthName,
          year,
          amount: calculatedAmount,
          goal: null // No goal set initially
        });
        console.log(`Created new savings for ${monthName} ${year} with amount ${calculatedAmount}`);
        return newSaving;
      }
    } catch (error) {
      console.error("Error auto-updating savings:", error);
      // Don't throw - this is a background operation
      return null;
    }
  }

  // Create test data for demonstration
  app.post(`${api}/demo-data`, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Create sample incomes
      await storage.createIncome({
        userId,
        name: "Salary",
        amount: 4250,
        category: "Employment",
        date: new Date(currentYear, currentMonth, 1),
        recurring: true,
        frequency: "monthly",
        notes: "Monthly salary"
      });
      
      // Create sample expenses
      await storage.createExpense({
        userId,
        name: "Grocery Shopping",
        amount: 85.40,
        category: "Food",
        date: new Date(currentYear, currentMonth, 15),
        recurring: false,
        frequency: null,
        notes: "Weekly groceries"
      });
      
      await storage.createExpense({
        userId,
        name: "Netflix Subscription",
        amount: 14.99,
        category: "Entertainment",
        date: new Date(currentYear, currentMonth, 10),
        recurring: true,
        frequency: "monthly",
        notes: "Monthly subscription"
      });
      
      await storage.createExpense({
        userId,
        name: "Dinner with Friends",
        amount: 65.20,
        category: "Dining",
        date: new Date(currentYear, currentMonth, 8),
        recurring: false,
        frequency: null,
        notes: "Restaurant dinner"
      });
      
      // Create sample vault goals
      await storage.createVaultGoal({
        userId,
        name: "Emergency Fund",
        targetAmount: 10000,
        currentAmount: 3000,
        deadline: new Date(currentYear + 1, 0, 1),
        notes: "Emergency fund for unexpected expenses"
      });
      
      await storage.createVaultGoal({
        userId,
        name: "Vacation 2023",
        targetAmount: 2500,
        currentAmount: 1800,
        deadline: new Date(currentYear, 7, 1),
        notes: "Summer vacation funds"
      });
      
      await storage.createVaultGoal({
        userId,
        name: "New Laptop",
        targetAmount: 1500,
        currentAmount: 900,
        deadline: new Date(currentYear, 11, 1),
        notes: "Saving for a new laptop"
      });
      
      // Create sample bills
      await storage.createBill({
        userId,
        name: "Internet Bill",
        amount: 59.99,
        dueDate: new Date(currentYear, currentMonth, now.getDate() + 2),
        category: "Utilities",
        recurring: true,
        frequency: "monthly",
        isPaid: false,
        reminderDays: 3,
        autoPayment: false,
        notes: "Monthly internet bill"
      });
      
      await storage.createBill({
        userId,
        name: "Credit Card Payment",
        amount: 350,
        dueDate: new Date(currentYear, currentMonth, now.getDate() + 5),
        category: "Finance",
        recurring: true,
        frequency: "monthly",
        isPaid: false,
        reminderDays: 5,
        autoPayment: false,
        notes: "Monthly credit card payment"
      });
      
      await storage.createBill({
        userId,
        name: "Phone Bill",
        amount: 45,
        dueDate: new Date(currentYear, currentMonth, now.getDate() + 8),
        category: "Utilities",
        recurring: true,
        frequency: "monthly",
        isPaid: false,
        reminderDays: 3,
        autoPayment: false,
        notes: "Monthly phone bill"
      });
      
      await storage.createBill({
        userId,
        name: "Car Loan EMI",
        amount: 275.50,
        dueDate: new Date(currentYear, currentMonth, now.getDate() + 12),
        category: "Loans",
        recurring: true,
        frequency: "monthly",
        isPaid: false,
        reminderDays: 5,
        autoPayment: false,
        notes: "Monthly car loan payment"
      });
      
      // Debt section removed
      
      res.status(200).json({ message: "Demo data created successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  


  const httpServer = createServer(app);
  return httpServer;
}




























































































































































































    
