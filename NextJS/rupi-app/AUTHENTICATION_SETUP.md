# Authentication Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rupi_db
DB_USER=postgres
DB_PASSWORD=password
```

## Database Setup

1. Make sure PostgreSQL is running
2. Create a database named `rupi_db`
3. Run the application - the database tables will be created automatically

## Features Added

### User Authentication
- User registration with email and password
- User login with email and password
- Password hashing with bcrypt
- JWT-based sessions
- Protected routes

### Database Changes
- Added `users` table with user information
- Updated all existing tables to include `user_id` foreign key
- All data is now user-specific
- Added proper indexes for performance

### API Changes
- All API routes now require authentication
- User context is automatically injected into all database operations
- Users can only access their own data

### UI Changes
- Added sign-in and sign-up pages
- Updated dashboard to show user information
- Added logout functionality
- Protected routes redirect to sign-in if not authenticated

## Usage

1. Start the application: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You'll be redirected to the sign-in page
4. Create an account or sign in with existing credentials
5. All your financial data will be private to your account

## Security Features

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens for session management
- All API routes are protected
- User data isolation in database
- CSRF protection via NextAuth
