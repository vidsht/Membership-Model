# MERN Stack Template

A minimal MERN (MongoDB, Express, React, Node.js) stack template with basic authentication and user management.

## Features

- **Authentication**: Session-based authentication with registration, login, and logout
- **User Management**: Basic user profile management
- **Protected Routes**: Frontend route protection
- **Responsive Design**: Mobile-first responsive UI
- **Error Handling**: Comprehensive error handling on both frontend and backend

## Tech Stack

### Backend
- **Node.js** & **Express.js** - Server framework
- **MongoDB** with **Mongoose** - Database and ODM
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **connect-mongo** - MongoDB session store
- **cors** - Cross-origin resource sharing

### Frontend
- **React** - Frontend framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management

## Project Structure

```
├── backend/
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   ├── models/
│   │   └── User.js           # User model
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   └── users.js          # User management routes
│   ├── .env                  # Environment variables
│   ├── package.json
│   └── server.js             # Express server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── App.js            # Main app component
│   └── package.json
└── package.json              # Root package.json
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mern-template
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/mern-template
   SESSION_SECRET=your-secret-key-here
   PORT=5000
   ```

4. **Start the development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend React app on http://localhost:3000

## Available Scripts

### Root Directory
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend
- `npm run install-all` - Install dependencies for all projects

### Backend (`/backend`)
- `npm run dev` - Start server with nodemon
- `npm start` - Start server in production

### Frontend (`/frontend`)
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user

### Users (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

## Database Schema

### User Model
```javascript
{
  fullName: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

### Backend (`.env`)
```
MONGODB_URI=mongodb://127.0.0.1:27017/mern-template
SESSION_SECRET=your-secret-key-here
PORT=5000
```

### Frontend (`.env`)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Protected routes and middleware
- Input validation and sanitization
- HTTP-only cookies for sessions
- CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this template for your projects.

## TODO / Enhancements

- [ ] Add password reset functionality
- [ ] Add email verification
- [ ] Add input validation middleware
- [ ] Add rate limiting
- [ ] Add API documentation with Swagger
- [ ] Add unit and integration tests
- [ ] Add Docker configuration
- [ ] Add CI/CD pipeline
- Deal tracking and usage analytics
- Validity period management

### 👤 Profile Management
- Personal information management
- Profile picture upload
- Membership plan selection
- Activity tracking

### 🏪 Merchant Panel
- Business owners can manage their listings
- Create and manage exclusive deals
- View deal analytics and member interactions

### 👑 Admin Panel
- System administration and configuration
- User management and moderation
- Business approval and management
- System analytics and reporting

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for data storage
- **Mongoose**: MongoDB object modeling for Node.js
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing and security
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Frontend
- **React**: Modern JavaScript library for building user interfaces
- **React Router**: Client-side routing for single-page application
- **Context API**: State management for authentication
- **Axios**: HTTP client for API requests
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Font Awesome**: Icons and visual elements
- **QR Code.js**: QR code generation for membership cards
- **JsBarcode**: Barcode generation for membership cards

### Database
- **MongoDB**: Document-based NoSQL database
- **Collections**: Users, Businesses, Deals, Merchants, AdminSettings

## Project Structure

```
Membership Model/
├── backend/                    # Node.js/Express backend
│   ├── package.json           # Backend dependencies
│   ├── server.js              # Main server file
│   ├── .env.example           # Environment variables template
│   ├── models/                # Mongoose models
│   │   ├── User.js            # User model
│   │   ├── Business.js        # Business model
│   │   ├── Deal.js            # Deal model
│   │   ├── Merchant.js        # Merchant model
│   │   └── AdminSettings.js   # Admin settings model
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User management routes
│   │   ├── businesses.js      # Business directory routes
│   │   ├── deals.js           # Deals management routes
│   │   ├── merchants.js       # Merchant panel routes
│   │   └── admin.js           # Admin panel routes
│   ├── controllers/           # Route controllers
│   └── middleware/            # Custom middleware
│       └── auth.js            # JWT authentication middleware
├── frontend/                  # React frontend
│   ├── package.json           # Frontend dependencies
│   ├── public/                # Static assets
│   │   └── index.html         # Main HTML template
│   └── src/                   # React source code
│       ├── index.js           # Entry point
│       ├── App.js             # Main App component
│       ├── App.css            # App styles
│       ├── index.css          # Global styles
│       ├── components/        # Reusable components
│       │   ├── Header.js      # Navigation header
│       │   ├── Footer.js      # Footer component
│       │   ├── ProtectedRoute.js  # Route protection
│       │   └── ErrorBoundary.js   # Error handling
│       ├── contexts/          # React contexts
│       │   └── AuthContext.js # Authentication context
│       ├── hooks/             # Custom React hooks
│       │   └── useResize.js   # Resize hook
│       ├── pages/             # Page components
│       │   ├── Home.js        # Home page
│       │   ├── Login.js       # Login page
│       │   ├── Register.js    # Registration page
│       │   ├── MembershipCard.js  # Membership card page
│       │   ├── Deals.js       # Exclusive deals page
│       │   ├── BusinessDirectory.js # Business directory
│       │   ├── UserSettings.js # User settings
│       │   ├── MerchantPanel.js   # Merchant dashboard
│       │   ├── AdminPanel.js  # Admin dashboard
│       │   ├── About.js       # About page
│       │   └── Contact.js     # Contact page
│       └── services/          # API services
│           └── api.js         # API client
├── .github/                   # GitHub configuration
├── .vscode/                   # VS Code configuration
├── README.md                  # This file
├── start-dev.bat              # Windows development start script
├── start-dev.sh               # Unix development start script
└── start-frontend.bat         # Frontend-only start script
```

## Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (v4.4 or higher)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   ```
   MONGODB_URI=mongodb://localhost:27017/membership_system
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=30d
   NODE_ENV=development
   PORT=5000
   ```

5. Start the backend server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

### Quick Start (Development)
For convenience, you can use the provided start scripts:

**Windows:**
```bash
start-dev.bat
```

**Unix/Linux/macOS:**
```bash
./start-dev.sh
```

**Frontend Only:**
```bash
start-frontend.bat
```

## Usage

### Getting Started
1. **Start the Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**:
   - Open your browser and go to `http://localhost:3001`
   - The backend API will be running on `http://localhost:5000`

### User Registration & Login
1. Click "Register" to create a new account
2. Fill in your details and select a membership plan
3. Login with your credentials using JWT authentication

### Creating Your Membership Card
1. After logging in, navigate to the "Membership Card" page
2. Your digital membership card will be automatically generated
3. Customize the card layout if desired
4. Download or save your membership card

### Exploring Features
- **Business Directory**: Browse local Indian businesses
- **Exclusive Deals**: View and use member-only deals
- **User Settings**: Update your personal information
- **Merchant Panel**: (For business owners) Manage your business listings and deals
- **Admin Panel**: (For administrators) System management and configuration

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatepassword` - Update password

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account

### Business Directory
- `GET /api/businesses` - Get all businesses
- `POST /api/businesses` - Create business (Admin/Merchant)
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business

### Deals Management
- `GET /api/deals` - Get all deals
- `POST /api/deals` - Create deal (Admin/Merchant)
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Merchant Panel
- `GET /api/merchants/dashboard` - Get merchant dashboard
- `GET /api/merchants/businesses` - Get merchant's businesses
- `GET /api/merchants/deals` - Get merchant's deals

### Admin Panel
- `GET /api/admin/dashboard` - Get admin dashboard
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Development

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/membership_system

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# Server
NODE_ENV=development
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001
```

### Database Schema
The application uses MongoDB with the following collections:

- **Users**: User accounts and profiles
- **Businesses**: Business directory listings
- **Deals**: Exclusive deals and offers
- **Merchants**: Merchant account information
- **AdminSettings**: System configuration

### Adding New Features
1. **Backend**: Add routes in `/backend/routes/`, controllers in `/backend/controllers/`, and models in `/backend/models/`
2. **Frontend**: Add components in `/frontend/src/components/`, pages in `/frontend/src/pages/`, and update routing in `App.js`

### Testing
- Backend: Run `npm test` in the backend directory
- Frontend: Run `npm test` in the frontend directory

## Deployment

### Backend Deployment
1. Set up a MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables for production
3. Deploy to services like Heroku, DigitalOcean, or AWS

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy the build folder to services like Netlify, Vercel, or AWS S3

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Future Enhancements

### Planned Features
- [ ] Email notifications and verification
- [ ] Payment processing for premium memberships
- [ ] Advanced analytics dashboard
- [ ] Mobile app version (React Native)
- [ ] Social media integration
- [ ] Event management system
- [ ] Multi-language support
- [ ] Real-time notifications
- [ ] File upload for profile pictures and business images

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support regarding the Indians in Ghana Membership System:

- Email: info@indiansinghana.org
- Website: [Coming Soon]
- Phone: +233 XX XXX XXXX

## Acknowledgments

- **React** team for the amazing frontend framework
- **Express.js** for the robust backend framework
- **MongoDB** for the flexible database solution
- **Font Awesome** for icons
- **QR Code.js** library for QR code generation
- **JsBarcode** library for barcode generation
- **Google Fonts** for typography
- **The Indian community in Ghana** for inspiration and requirements

---

**Note**: This is a full-stack MERN application ready for development and production deployment. All legacy HTML/CSS/JS files have been converted to the modern React-based architecture while preserving the original functionality and design.
