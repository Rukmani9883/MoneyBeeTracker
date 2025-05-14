@echo off
echo Setting up MoneyBee database...
echo.

REM Check if PostgreSQL is installed and in PATH
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL is not installed or not in PATH.
    echo Please install PostgreSQL and add it to your PATH.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo Creating moneybee database if it doesn't exist...
psql -U postgres -c "CREATE DATABASE moneybee WITH ENCODING 'UTF8';" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Note: Database might already exist or there was an error.
    echo Continuing anyway...
    echo.
)

echo Running schema script...
psql -U postgres -d moneybee -f schema.sql

echo.
echo Database setup complete!
echo You can now run start-local.bat to start the application.
echo.

pause