@echo off
echo Starting MoneyBee Application in local development mode...
echo.

REM Set environment variables
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moneybee
set SESSION_SECRET=money-bee-local-development-secret
set NODE_ENV=development

REM Run the application
npx tsx server/index.ts

pause