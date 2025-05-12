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
  console.log("Authentication check - Session:", req.session);
  console.log("Authentication check - User ID:", req.session.userId);
  
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
  const sessionStore = new PgSession({
    pool,
    tableName: 'sessions', // Use the existing sessions table
    createTableIfMissing: true,
  });
  
  app.use(
    session({
      store: sessionStore,
      name: 'connect.sid', // Use the default Express session cookie name for consistency
      secret: process.env.SESSION_SECRET || 'money-bee-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false for development since we're not using HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      },
      rolling: true, // Resets cookie expiration on each request
    })
  );
  
  // Debug middleware to log session on every request
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log("Request path:", req.path);
    console.log("Session debug - ID:", req.sessionID);
    console.log("Session debug - Cookie:", req.headers.cookie);
    console.log("Session debug - User ID:", req.session.userId);
    next();
  });

  // prefix all routes with /api
  const api = "/api";

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
      console.log("Session ID:", req.sessionID);
      console.log("Full session object:", req.session);
      
      // Save session explicitly to ensure it's stored before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        // Don't return password in response
        const { password: userPassword, ...userWithoutPassword } = user;
        
        // Check our session data again after save
        console.log("After save - Session ID:", req.sessionID);
        console.log("After save - User ID in session:", req.session.userId);
        
        console.log("Login successful for user:", username);
        
        // Include session info in the response for debugging
        res.status(200).json({
          ...userWithoutPassword,
          sessionInfo: {
            sessionId: req.sessionID,
            sessionUserId: req.session.userId
          }
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });
  
  app.get(`${api}/auth/user`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Get user profile - Session ID:", req.sessionID);
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
      const sessionID = req.sessionID;
      console.log("Session ID being destroyed:", sessionID);
      
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
  
  // Add reset data route
  app.post(`${api}/reset-data`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const success = await storage.clearAllData(userId);
      
      if (success) {
        res.status(200).json({ message: "All data has been reset successfully" });
      } else {
        res.status(500).json({ message: "Failed to reset data" });
      }
    } catch (error) {
      res.status(500).json({ message: "An error occurred while resetting data" });
    }
  });

  // Income routes
  app.get(`${api}/incomes`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const incomeData = insertIncomeSchema.parse(req.body);
      const income = await storage.createIncome(incomeData);
      res.status(201).json(income);
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
      const incomeData = req.body;
      
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

  app.get(`${api}/incomes/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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

  // Expense routes
  app.get(`${api}/expenses`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
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
      const expenseData = req.body;
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

  app.get(`${api}/expenses/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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

  // Savings routes
  app.get(`${api}/savings`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const savingData = insertSavingsSchema.parse(req.body);
      const saving = await storage.createSaving(savingData);
      res.status(201).json(saving);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/savings/monthly`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const savingData = req.body;
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
      const userId = parseInt(req.query.userId as string);
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
      const goalData = insertVaultGoalSchema.parse(req.body);
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
      const goalData = req.body;
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

  // Debt routes
  app.get(`${api}/debts`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if month and year are provided for filtering
      // Note: Frontend sends 1-based month, but JS Date uses 0-based month
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) - 1 : undefined;
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : undefined;
      
      let debts;
      
      try {
        // Get all debts first
        debts = await storage.getDebts(userId);
        
        // If month and year are provided, filter the debts
        if (month !== undefined && year !== undefined && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12) {
          console.log(`Filtering debts for month ${month + 1} and year ${year}`);
          
          // Filter debts by due date in the specified month and year
          debts = debts.filter(debt => {
            if (!debt.dueDate) return true; // Include debts without due dates
            
            const dueDate = new Date(debt.dueDate);
            return dueDate.getMonth() === month && dueDate.getFullYear() === year;
          });
        }
        
        return res.status(200).json(debts);
      } catch (err: any) {
        console.error("Error processing debts:", err);
        return res.status(200).json([]); // Return empty array on error
      }
    } catch (error: any) {
      console.error("Error in debts endpoint:", error);
      res.status(400).json({ message: error.message || "Error retrieving debts" });
    }
  });

  app.post(`${api}/debts`, async (req: Request, res: Response) => {
    try {
      const debtData = insertDebtSchema.parse(req.body);
      const debt = await storage.createDebt(debtData);
      res.status(201).json(debt);
    } catch (error) {
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
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`${api}/debts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const debtData = req.body;
      const updatedDebt = await storage.updateDebt(id, debtData);
      
      if (!updatedDebt) {
        return res.status(404).json({ message: "Debt not found" });
      }
      
      res.status(200).json(updatedDebt);
    } catch (error) {
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
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/debts/by-ownership`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const isOwedByUser = req.query.isOwedByUser === 'true';
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const debts = await storage.getDebtsByOwnership(userId, isOwedByUser);
      const total = await storage.getTotalDebts(userId, isOwedByUser);
      
      res.status(200).json({ debts, total });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bills routes
  app.get(`${api}/bills`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const billData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      res.status(400).json({ message: error.message });
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
      const billData = req.body;
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

  app.get(`${api}/bills/upcoming`, async (req: Request, res: Response) => {
    try {
      // Get current date values if parameters are not provided
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-indexed month
      
      // Parse parameters with fallbacks
      let userId = NaN;
      try {
        userId = parseInt(req.query.userId as string);
      } catch (e) {
        // Will be caught by isNaN check
      }
      
      const daysAhead = parseInt(req.query.daysAhead as string) || 30;
      
      // Default to current month/year if values are missing or invalid
      let month = currentMonth;
      let year = currentYear;
      
      if (req.query.month) {
        const parsedMonth = parseInt(req.query.month as string);
        if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
          month = parsedMonth;
        }
      }
      
      if (req.query.year) {
        const parsedYear = parseInt(req.query.year as string);
        if (!isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100) {
          year = parsedYear;
        }
      }
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Safely handle errors in case the function fails
      try {
        let bills = await storage.getBillsForMonth(userId, month, year);
        res.status(200).json(bills);
      } catch (billError: any) {
        console.error("Error fetching upcoming bills:", billError);
        // Return an empty array instead of an error
        res.status(200).json([]);
      }
    } catch (error: any) {
      console.error("Error in upcoming bills endpoint:", error);
      res.status(400).json({ message: "Error fetching upcoming bills" });
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
      const userId = parseInt(req.query.userId as string);
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
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(`${api}/transactions/recent`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      const userId = parseInt(req.query.userId as string);
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

  // Dashboard summary route
  app.get(`${api}/dashboard/summary`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get month and year from query params if provided, otherwise use current date
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : new Date().getMonth();
      const year = req.query.year !== undefined ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      if (isNaN(month) || isNaN(year)) {
        return res.status(400).json({ message: "Invalid month or year" });
      }
      
      const now = new Date();
      const currentMonth = month;
      const currentYear = year;
      
      // Get total income for current month
      const totalIncome = await storage.getTotalIncome(userId, currentMonth, currentYear);
      
      // Get total expenses for current month
      const totalExpenses = await storage.getTotalExpenses(userId, currentMonth, currentYear);
      
      // Calculate savings (income - expenses)
      const savings = totalIncome - totalExpenses;
      
      // Get all vault goals and sum up current amounts
      const vaultGoals = await storage.getVaultGoals(userId);
      const totalVault = vaultGoals.reduce((total, goal) => total + goal.currentAmount, 0);
      
      // Get total debts
      const totalDebtsOwed = await storage.getTotalDebts(userId, true);
      const totalDebtsOwedToUser = await storage.getTotalDebts(userId, false);
      
      // Get upcoming bills
      const upcomingBills = await storage.getUpcomingBills(userId, 30);
      const totalBills = upcomingBills.reduce((total, bill) => total + bill.amount, 0);
      
      // Get recent transactions
      const recentTransactions = await storage.getRecentTransactions(userId, 5);
      
      // Return all summary data
      res.status(200).json({
        totalIncome,
        totalExpenses,
        savings,
        totalVault,
        totalDebts: totalDebtsOwed,
        totalDebtsOwedToUser,
        totalBills,
        upcomingBills,
        recentTransactions
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Create test data for demonstration
  app.post(`${api}/demo-data`, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
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
      
      // Create sample debts
      await storage.createDebt({
        userId,
        name: "Car Loan",
        isOwedByUser: true,
        totalAmount: 15000,
        remainingAmount: 12500,
        interestRate: 4.5,
        dueDate: new Date(currentYear + 3, 0, 1),
        monthlyPayment: 275.50,
        category: "Auto Loan",
        notes: "5-year car loan"
      });
      
      await storage.createDebt({
        userId,
        name: "John's Borrowed Money",
        isOwedByUser: false,
        totalAmount: 500,
        remainingAmount: 500,
        interestRate: 0,
        dueDate: new Date(currentYear, currentMonth + 1, 15),
        monthlyPayment: 500,
        category: "Personal Loan",
        notes: "Money lent to John"
      });
      
      res.status(200).json({ message: "Demo data created successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  


  const httpServer = createServer(app);
  return httpServer;
}
