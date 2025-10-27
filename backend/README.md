# Uplink Backend API

A robust backend API for the Uplink digital asset delivery platform, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 📁 **File Upload & Management** - Multi-format file support with S3 storage
- 🎨 **Dynamic Watermarking** - Automatic watermark generation for previews
- 💳 **Payment Integration** - Cashfree payment gateway for UPI payments
- 📊 **Analytics & Tracking** - Comprehensive analytics for creators
- 🛡️ **Security** - Rate limiting, input validation, and security headers
- 🚀 **Scalable Architecture** - Modular, well-structured codebase

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Storage**: Cloudflare R2
- **Payment**: Cashfree Payment Gateway
- **Authentication**: JWT
- **File Processing**: Sharp, FFmpeg
- **Validation**: Joi, Express Validator

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # MongoDB connection
│   │   ├── aws.ts       # AWS S3 configuration
│   │   └── cashfree.ts  # Payment gateway config
│   ├── controllers/     # Route controllers
│   │   ├── authController.ts
│   │   ├── fileController.ts
│   │   ├── paymentController.ts
│   │   ├── userController.ts
│   │   └── analyticsController.ts
│   ├── middleware/      # Custom middleware
│   │   ├── auth.ts      # Authentication middleware
│   │   ├── validation.ts # Input validation
│   │   ├── upload.ts    # File upload handling
│   │   ├── security.ts  # Security middleware
│   │   └── errorHandler.ts
│   ├── models/          # Database models
│   │   ├── User.ts
│   │   ├── File.ts
│   │   ├── Payment.ts
│   │   └── Analytics.ts
│   ├── routes/          # API routes
│   │   ├── auth.ts
│   │   ├── file.ts
│   │   ├── payment.ts
│   │   ├── user.ts
│   │   └── analytics.ts
│   ├── services/        # Business logic services
│   │   └── watermarkService.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   └── jwt.ts
│   └── index.ts         # Application entry point
├── .env.example         # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/uplink

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# Cloudflare R2 Storage Configuration
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=uplink
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-account-id.r2.cloudflarestorage.com/uplink

# Cashfree Payment Gateway
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_WEBHOOK_SECRET=your-webhook-secret

# File Upload Configuration
MAX_FILE_SIZE=100MB
ALLOWED_FILE_TYPES=mp4,avi,mov,mkv,mp3,wav,png,jpg,jpeg,gif,pdf,doc,docx,blend,obj,fbx

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/change-password` - Change password
- `DELETE /api/v1/auth/account` - Delete account

### Files
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files` - Get user's files
- `GET /api/v1/files/public` - Get public files
- `GET /api/v1/files/:id` - Get file by ID
- `PUT /api/v1/files/:id` - Update file
- `DELETE /api/v1/files/:id` - Delete file
- `GET /api/v1/files/:id/download` - Get download URL

### Payments
- `POST /api/v1/payments` - Create payment
- `GET /api/v1/payments/user` - Get user's payments
- `GET /api/v1/payments/creator` - Get creator's payments
- `GET /api/v1/payments/:id` - Get payment by ID
- `GET /api/v1/payments/stats` - Get payment statistics
- `POST /api/v1/payments/webhook` - Payment webhook

### Users
- `GET /api/v1/users/search` - Search users
- `GET /api/v1/users/:id` - Get user profile
- `GET /api/v1/users/:id/files` - Get user's public files
- `GET /api/v1/users/:id/stats` - Get user statistics

### Analytics
- `POST /api/v1/analytics/track` - Track event
- `GET /api/v1/analytics/dashboard` - Get dashboard stats
- `GET /api/v1/analytics/creator` - Get creator analytics
- `GET /api/v1/analytics/top-files` - Get top files
- `GET /api/v1/analytics/file/:fileId` - Get file analytics

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Security Features

- **Rate Limiting** - Prevents abuse with configurable limits
- **Input Validation** - Comprehensive validation using Joi and Express Validator
- **File Security** - File type validation and malicious content detection
- **JWT Authentication** - Secure token-based authentication
- **CORS Protection** - Configurable cross-origin resource sharing
- **Security Headers** - Helmet.js for security headers
- **Request Sanitization** - Automatic sanitization of user input

## File Upload & Processing

- **Multi-format Support** - Images, videos, audio, documents, 3D models
- **Automatic Watermarking** - Dynamic watermark generation for previews
- **R2 Integration** - Secure cloud storage with presigned URLs
- **File Validation** - Size, type, and content validation
- **Preview Generation** - Automatic preview generation for videos

## Payment Integration

- **Cashfree Gateway** - UPI, cards, net banking support
- **Webhook Handling** - Secure webhook processing
- **Payment Tracking** - Comprehensive payment status tracking
- **Revenue Analytics** - Detailed revenue and payment analytics

## Database Models

### User
- Authentication and profile information
- Role-based access control
- UPI ID for payments

### File
- File metadata and storage information
- Watermark and preview URLs
- Pricing and visibility settings

### Payment
- Payment processing and status tracking
- Cashfree integration
- Revenue tracking

### Analytics
- Event tracking and analytics
- Performance metrics
- User behavior analysis

## Development

### Code Structure
- **Modular Architecture** - Well-organized, maintainable code
- **TypeScript** - Type safety and better development experience
- **Error Handling** - Comprehensive error handling and logging
- **Validation** - Input validation and sanitization
- **Documentation** - Well-documented code and API

### Best Practices
- **Security First** - Security considerations in every component
- **Performance** - Optimized database queries and caching
- **Scalability** - Designed for horizontal scaling
- **Maintainability** - Clean, readable, and well-structured code

## Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Start the production server**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
