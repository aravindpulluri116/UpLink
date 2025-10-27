#!/bin/bash

# Uplink Backend Setup Script

echo "🚀 Setting up Uplink Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB 6.0+ or use Docker."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs

# Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start MongoDB (if not using Docker)"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Visit http://localhost:5000/health to check if the server is running"
echo ""
echo "For production deployment:"
echo "1. Update environment variables for production"
echo "2. Run 'npm start' to start the production server"
echo "3. Or use 'docker-compose up' for containerized deployment"
