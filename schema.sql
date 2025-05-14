-- MoneyBee Database Schema

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date TIMESTAMP NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(50),
    notes TEXT,
    category VARCHAR(100)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date TIMESTAMP NOT NULL,
    category VARCHAR(100),
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(50),
    notes TEXT
);

-- Create savings table
CREATE TABLE IF NOT EXISTS savings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    UNIQUE(user_id, month, year)
);

-- Create vault_goals table
CREATE TABLE IF NOT EXISTS vault_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    deadline TIMESTAMP,
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(50),
    category VARCHAR(100),
    notes TEXT
);

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2),
    debt_type VARCHAR(50) NOT NULL,
    debt_to VARCHAR(255),
    debt_from VARCHAR(255),
    due_date TIMESTAMP,
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    source_id INTEGER,
    destination_id INTEGER,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100)
);

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_sessions_expire ON sessions (expire);

-- Insert a test user with hashed password 'password123'
-- The hashed password corresponds to 'password123' using bcrypt
INSERT INTO users (username, password, name, email)
VALUES ('testuser', '$2a$10$Vp3wNRLuNjz/zRsTrDvN2.6yhkULjcl0SUXBm6YuRbpz3ZLrMeO/e', 'Test User', 'test@example.com')
ON CONFLICT (username) DO NOTHING;