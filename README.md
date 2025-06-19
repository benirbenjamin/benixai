# BenixSpace AI Music Generation App

A full-stack application for AI-powered music generation with multiple music generation services, subscription plans, user authentication, and payment processing.

## Features

- User authentication (register, login, logout)
- Subscription plans (Free Trial, Basic, Standard, Premium)
- AI music generation with parameters (genre, tempo, mood, duration)
- JavaScript-friendly music generation services with automatic fallbacks:
  - Stability AI Audio Generation API for high-quality beat generation
  - OpenAI for vocals and TTS capabilities
- Beat generation with genre-specific characteristics
- Voice cloning technology using OpenAI's text-to-speech models
- Separate vocal and instrumental track generation
- Voice recording for music generation input and voice cloning
- File upload for music generation input
- Admin panel for managing users, plans, and system configuration
- Payment processing with Flutterwave
- RESTful API endpoints

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS templates, JavaScript, CSS
- **Database**: MySQL
- **Authentication**: bcryptjs, express-session
- **AI Integration**: 
  - Stability AI Audio Generation API (for beat generation)
  - OpenAI API (for vocals and TTS)
- **Payment**: Flutterwave API
- **File Storage**: Local storage (can be extended to cloud storage)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL database
- At least one of the following API keys:
  - Stability AI API key (for beat generation)
  - OpenAI API key (for vocal synthesis)
- Flutterwave account (for payment processing)

### Installation

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Set up your MySQL database and update the connection details in `.env`
5. Run the full setup (initializes database)
   ```
   npm run setup
   ```
6. Create an admin user
   ```
   npm run create-admin your@email.com yourpassword
   ```
7. Run the development server
   ```
   npm run dev
   ```
8. Access the application at http://localhost:3000 (or your configured port)

## Environment Variables

Create a `.env` file with the following variables:

## Project Structure

```
├── app.js                # Main application entry point
├── config/               # Configuration files
│   ├── database.js       # Database connection configuration
│   └── plans.js          # Subscription plans configuration
├── controllers/          # Route controllers
│   ├── adminController.js    # Admin panel controller
│   ├── apiController.js      # API endpoints controller
│   ├── authController.js     # Authentication controller
│   ├── dashboardController.js # User dashboard controller
│   └── recordController.js   # Voice recording controller
├── middleware/           # Express middleware
│   └── auth.js           # Authentication middleware
├── models/               # Database models
│   ├── AdminConfig.js    # Admin configuration model
│   ├── MusicGeneration.js # Music generation model
│   ├── Subscription.js   # User subscription model
│   └── User.js           # User model
├── public/               # Static public assets
│   ├── assets/           # Images and other assets
│   ├── css/              # CSS stylesheets
│   └── js/               # Client-side JavaScript
├── routes/               # Express routes
│   ├── admin.js          # Admin routes
│   ├── api.js            # API routes
│   ├── auth.js           # Authentication routes
│   ├── dashboard.js      # Dashboard routes
│   └── record.js         # Recording routes
├── uploads/              # User uploaded files
├── utils/                # Utility scripts
│   ├── createAdmin.js    # Admin user creation script
│   └── initDb.js         # Database initialization script
└── views/                # EJS templates
    ├── partials/         # Reusable template parts
    └── ...               # Various page templates
```

## Database Tables

The application uses the following database tables:

1. **users** - Stores user accounts and authentication information
2. **subscriptions** - Tracks user subscription plans and expiration dates
3. **song_usage** - Records daily song generation usage for quota tracking
4. **music_generations** - Stores music generation records and file paths
5. **admin_config** - Stores application-wide configuration values

```
# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=benixspace

# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key

# Application URL (for callback URLs)
APP_URL=http://localhost:3000
```

## Database Schema

The application uses the following tables:

- `users`: Stores user account information
- `subscriptions`: Stores user subscription details
- `music_generations`: Stores user's music generation history
- `admin_config`: Stores system configuration

## API Endpoints

### Authentication
- `POST /api/auth/login`: User login
- `POST /api/auth/register`: User registration

### User
- `GET /api/user`: Get user profile
- `GET /api/user/subscription`: Get user subscription details

### Music Generation
- `POST /api/music/generate`: Generate music with parameters
- `GET /api/music/history`: Get user's music generation history
- `GET /api/music/:id`: Get specific music generation details

### Payment
- `POST /api/payments/initiate`: Initiate a payment
- `POST /api/payments/verify`: Verify a payment
- `GET /api/payments/history`: Get user's payment history

## Subscription Plans

- **Free Trial**: 7-day trial with limited features
- **Basic**: Basic features with limited daily generations
- **Standard**: More features and increased daily generations
- **Premium**: Full access with maximum daily generations

## Admin Panel

The admin panel allows administrators to:

- View user statistics
- Manage subscription plans
- Configure system settings
- View music generation reports

## License

ISC
