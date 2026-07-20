@echo off
SETLOCAL EnableDelayedExpansion

TITLE DMS Server Setup Utility

echo ===================================================
echo   Document Management System (DMS) Setup Utility
echo ===================================================
echo.

:: 1. Check for Node.js
node -v >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js v18+ first.
    pause
    exit /b
)
echo [OK] Node.js is installed.

:: 2. Check for PostgreSQL
psql --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] PostgreSQL 'psql' command not found. 
    echo Please ensure PostgreSQL is installed and added to your System PATH.
    pause
    exit /b
)
echo [OK] PostgreSQL is installed.

echo.
echo ---------------------------------------------------
echo STEP 1: PostgreSQL Database Configuration
echo ---------------------------------------------------
set /p PG_SUPERUSER="Enter PostgreSQL Superuser (default 'postgres'): "
if "!PG_SUPERUSER!"=="" set PG_SUPERUSER=postgres

set "PGPASSWORD="
set /p PG_PASSWORD="Enter Password for !PG_SUPERUSER!: "

set /p DB_NAME="Enter Database Name to create (default 'dms_db'): "
if "!DB_NAME!"=="" set DB_NAME=dms_db

set /p DB_USER="Enter Database Username to create (default 'dms_user'): "
if "!DB_USER!"=="" set DB_USER=dms_user

set /p DB_PASS="Enter Password for !DB_USER! (default 'dms_password'): "
if "!DB_PASS!"=="" set DB_PASS=dms_password

echo.
echo Creating Database and User...
set PGPASSWORD=!PG_PASSWORD!
psql -U !PG_SUPERUSER! -c "CREATE USER !DB_USER! WITH PASSWORD '!DB_PASS!';" 2>nul
psql -U !PG_SUPERUSER! -c "ALTER USER !DB_USER! WITH SUPERUSER;" 2>nul
psql -U !PG_SUPERUSER! -c "CREATE DATABASE !DB_NAME! OWNER !DB_USER!;" 2>nul

echo [INFO] Database and User setup completed.

echo.
echo ---------------------------------------------------
echo STEP 2: Installing Global Tools (PM2, serve)
echo ---------------------------------------------------
call npm install -g pm2@latest serve@latest
echo [OK] Global tools installed.

echo.
echo ---------------------------------------------------
echo STEP 3: Backend Setup
echo ---------------------------------------------------
cd backend
if not exist ".env" (
    echo Creating backend/.env...
    (
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_USERNAME=!DB_USER!
        echo DB_PASSWORD=!DB_PASS!
        echo DB_DATABASE=!DB_NAME!
        echo.
        echo JWT_SECRET=dms_secret_key_123456
        echo JWT_REFRESH_SECRET=dms_refresh_secret_key_123456
        echo JWT_EXPIRATION=15m
        echo JWT_REFRESH_EXPIRATION=7d
        echo.
        echo UPLOAD_PATH=./uploads
    ) > .env
)

echo Installing backend dependencies...
call npm install
echo Building backend...
call npm run build

echo Starting backend with PM2...
call pm2 delete dms-backend 2>nul
call pm2 start dist/main.js --name dms-backend
cd ..

echo.
echo ---------------------------------------------------
echo STEP 4: Frontend Setup
echo ---------------------------------------------------
cd frontend
echo Installing frontend dependencies...
call npm install
echo Building frontend...
call npm run build

echo Starting frontend with PM2 (using serve)...
call pm2 delete dms-frontend 2>nul
call pm2 start "serve -s dist -l 5173" --name dms-frontend
cd ..

echo.
echo ---------------------------------------------------
echo STEP 5: Optional Portals (Customer Feedback, Training, & Formats)
echo ---------------------------------------------------
set /p START_OPTIONAL="Do you want to set up and start additional portals? (y/n): "
if /i "!START_OPTIONAL!"=="y" (
    echo Setting up Customer Feedback UI...
    cd customer-feedback-ui
    if exist "package.json" (
        call npm install
        call npm run build
        call pm2 delete dms-feedback 2>nul
        call pm2 start "serve -s dist -l 5174" --name dms-feedback
    )
    cd ..

    echo Setting up Training Attendance Portal (Next.js)...
    cd training-attendance-portal
    if exist "package.json" (
        call npm install
        call npm run build
        call pm2 delete dms-training 2>nul
        :: Next.js needs 'next start'
        call pm2 start "npm run start -- -p 5177" --name dms-training
    )
    cd ..

    echo Setting up Formats Portal (Vite + React)...
    cd formats-portal
    if exist "package.json" (
        call npm install
        call npm run build
        call pm2 delete dms-formats 2>nul
        call pm2 start "serve -s dist -l 5175" --name dms-formats
    )
    cd ..
)

echo.
echo ===================================================
echo SETUP COMPLETE!
echo ===================================================
echo Main Frontend: http://localhost:5173
echo Backend API:   http://localhost:3000
if /i "!START_OPTIONAL!"=="y" (
    echo Feedback UI:   http://localhost:5174
    echo Training UI:   http://localhost:5177
    echo Formats Portal: http://localhost:5175
)
echo.
echo Use 'pm2 status' to check running processes.
echo Use 'pm2 logs' to view logs.
echo ===================================================
pause
