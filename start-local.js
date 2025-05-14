// Simple script to start the server with environment variables set
console.log('Setting up environment for local development...');

// Set environment variables
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/moneybee';
process.env.SESSION_SECRET = 'money-bee-local-development-secret';
process.env.NODE_ENV = 'development';

console.log('Environment variables set:');
console.log('- DATABASE_URL: Set (using postgres:postgres)');
console.log('- SESSION_SECRET: Set');
console.log('- NODE_ENV:', process.env.NODE_ENV);

console.log('\nStarting server...');

// Import and run the server
import('./server/index.ts')
  .catch(error => {
    console.error('\nServer startup error:');
    console.error(error);
    
    if (error.message && error.message.includes('Cannot find module')) {
      console.error('\nTip: You might need to install missing dependencies. Try:');
      console.error('npm install ts-node tsx dotenv @types/node');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nDatabase connection error:');
      console.error('Make sure PostgreSQL is running and the moneybee database exists.');
      console.error('\nYou can create the database with:');
      console.error('psql -U postgres -c "CREATE DATABASE moneybee;"');
    }
  });