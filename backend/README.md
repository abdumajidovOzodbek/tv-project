# IPTV Backend Server

A comprehensive Node.js backend for the IPTV React application with real-time chat, user authentication, and admin panel functionality.

## Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Admin and user roles
- **Real-time Chat** - Socket.io powered live chat for each channel
- **Channel Management** - Full CRUD operations for TV channels
- **User Management** - User profiles, favorites, and admin controls
- **MongoDB Integration** - Mongoose ODM with proper schemas
- **Security** - Helmet, CORS, rate limiting, and input validation
- **Error Handling** - Comprehensive error handling and logging

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **express-validator** - Input validation

## Installation

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

4. **Configure environment variables in `.env`**
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/iptv_app
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
FRONTEND_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

5. **Start MongoDB** (make sure MongoDB is running)

6. **Run the server**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - User logout
- `PUT /api/auth/change-password` - Change password

### Channels
- `GET /api/channels` - Get all channels (with pagination/filtering)
- `GET /api/channels/:id` - Get single channel
- `POST /api/channels` - Create channel (Admin only)
- `PUT /api/channels/:id` - Update channel (Admin only)
- `DELETE /api/channels/:id` - Delete channel (Admin only)
- `PATCH /api/channels/:id/toggle` - Toggle channel status (Admin only)
- `GET /api/channels/meta/categories` - Get channel categories
- `PATCH /api/channels/:id/viewers` - Update viewer count

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get single user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/stats/overview` - Get user statistics (Admin only)
- `POST /api/users/favorites/:channelId` - Add channel to favorites
- `DELETE /api/users/favorites/:channelId` - Remove from favorites
- `POST /api/users/:id/reset-password` - Reset user password (Admin only)

### Chat
- `GET /api/chat/:channelId` - Get chat messages for channel
- `POST /api/chat/:channelId` - Send message to channel
- `PUT /api/chat/message/:messageId` - Edit message
- `DELETE /api/chat/message/:messageId` - Delete message
- `GET /api/chat/:channelId/stats` - Get chat statistics (Admin only)
- `POST /api/chat/message/:messageId/reaction` - Toggle message reaction

## Socket.io Events

### Client to Server
- `join-channel` - Join a channel room
- `leave-channel` - Leave a channel room
- `send-message` - Send chat message
- `typing` - Typing indicator
- `toggle-reaction` - Toggle message reaction

### Server to Client
- `new-message` - New chat message received
- `user-joined` - User joined channel
- `user-left` - User left channel
- `typing` - User typing indicator
- `viewer-count-updated` - Channel viewer count updated
- `reaction-updated` - Message reaction updated
- `system-message` - System message
- `error` - Error message

## Database Schema

### User Model
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (required, hashed),
  role: String (enum: ['admin', 'user']),
  isOnline: Boolean,
  lastSeen: Date,
  favoriteChannels: [ObjectId],
  isActive: Boolean,
  timestamps: true
}
```

### Channel Model
```javascript
{
  name: String (required),
  description: String (required),
  category: String (required),
  streamUrl: String (required, .m3u8/.mpd),
  thumbnail: String (required, image URL),
  isActive: Boolean,
  viewerCount: Number,
  totalViews: Number,
  createdBy: ObjectId (User),
  timestamps: true
}
```

### ChatMessage Model
```javascript
{
  channelId: ObjectId (Channel),
  userId: ObjectId (User),
  username: String,
  message: String (required),
  messageType: String (enum: ['text', 'emoji', 'system']),
  isEdited: Boolean,
  isDeleted: Boolean,
  reactions: [{ userId, emoji, createdAt }],
  timestamps: true
}
```

## Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs with salt rounds
- **Rate Limiting** - Prevent API abuse
- **Input Validation** - express-validator for all inputs
- **CORS Configuration** - Proper cross-origin setup
- **Helmet Security** - Security headers
- **Role-based Access** - Admin/user permissions
- **SQL Injection Prevention** - Mongoose ODM protection

## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Environment Variables
Make sure to set all required environment variables in `.env` file.

### Database Initialization
The server automatically creates:
- Default admin user (configurable via env vars)
- Sample channels for testing
- Required indexes for performance

## Deployment

1. **Set production environment variables**
2. **Use a production MongoDB instance**
3. **Set NODE_ENV=production**
4. **Use a process manager like PM2**
5. **Set up reverse proxy (nginx)**
6. **Enable SSL/HTTPS**

## Error Handling

The server includes comprehensive error handling:
- Validation errors
- Authentication errors
- Database errors
- Socket.io errors
- Graceful shutdown handling

## Logging

All errors and important events are logged to the console. In production, consider using a logging service like Winston or Morgan.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.