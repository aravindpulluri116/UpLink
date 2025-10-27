@echo off
REM Uplink Backend Setup Script for Windows

echo 🚀 Setting up Uplink Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ⚠️  Please update .env file with your configuration
) else (
    echo ✅ .env file already exists
)

REM Create logs directory
if not exist logs mkdir logs

REM Build the project
echo 🔨 Building the project...
npm run build

echo ✅ Setup completed successfully!
echo.
echo Next steps:
echo 1. Update .env file with your configuration
echo 2. Start MongoDB (if not using Docker)
echo 3. Run 'npm run dev' to start the development server
echo 4. Visit http://localhost:5000/health to check if the server is running
echo.
echo For production deployment:
echo 1. Update environment variables for production
echo 2. Run 'npm start' to start the production server
echo 3. Or use 'docker-compose up' for containerized deployment

pause
