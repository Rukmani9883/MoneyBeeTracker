import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For local development, use a default connection string if DATABASE_URL is not set
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/moneybee';
console.log('Using database connection:', process.env.DATABASE_URL ? 'Environment variable' : 'Default local connection');

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
