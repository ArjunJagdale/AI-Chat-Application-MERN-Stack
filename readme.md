# Claude - AI Chat Application

A modern, full-stack AI chat application built with the MERN stack, featuring real-time messaging, multiple AI model support, and a sleek, animated user interface.

## Demo Video


## Features

- **Real-time AI Chat** - Interactive conversations with AI models
- **Multiple AI Models** - Support for various AI providers and models
- **User Authentication** - Secure login and registration system
- **Chat Management** - Create, edit, rename, and delete chat conversations
- **Real-time Updates** - WebSocket integration for live message updates
- **Responsive Design** - Modern UI with smooth animations and transitions
- **Message History** - Persistent chat storage and retrieval
- **Copy to Clipboard** - Easy copying of AI responses
- **Model Selection** - Dynamic switching between different AI models

## Tech Stack

### Frontend
- **React** - Component-based UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Toast notifications
- **React Markdown** - Markdown rendering for AI responses
- **Lucide React** - Beautiful icon library
- **Date-fns** - Date formatting utilities
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing

## Project Structure

```
claude-clone/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Chat.js
│   │   └── User.js
│   ├── routes/
│   │   ├── ai.js
│   │   ├── auth.js
│   │   └── chat.js
│   ├── .env
│   ├── package.json
│   └── Server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.js
│   │   │   ├── ClaudeInterface.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── contexts/
│   │   ├── App.css
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/claude-chat
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
OPENROUTER_API_KEY=your-key
# Add other AI provider API keys as needed
```

4. Start the backend server:
```bash
npm run dev
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

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### Authentication
1. Register a new account or login with existing credentials
2. Upon successful authentication, you'll be redirected to the main chat interface

### Chat Interface
1. **Create New Chat** - Click the "New chat" button to start a conversation
2. **Select AI Model** - Use the model selector in the top-right to choose your preferred AI model
3. **Send Messages** - Type your message and press Enter or click the send button
4. **Manage Chats** - Edit chat titles, delete conversations, or switch between chats using the sidebar
5. **Copy Responses** - Click the copy button on AI messages to copy them to clipboard

### Real-time Features
- Messages appear instantly across all connected clients
- Chat list updates automatically when new conversations are created
- Live typing indicators during AI response generation

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Chat Management
- `GET /api/chat` - Get all user chats
- `POST /api/chat` - Create new chat
- `GET /api/chat/:id` - Get specific chat with messages
- `PUT /api/chat/:id` - Update chat title
- `DELETE /api/chat/:id` - Delete chat

### AI Integration
- `POST /api/ai/chat` - Send message to AI and get response
- `GET /api/ai/models` - Get available AI models

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://-----------@cluster0.sx1m1og.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your----------
OPENROUTER_API_KEY=sk-or---------
FRONTEND_URL=http://localhost:3000
```

## Features in Detail

### Real-time Communication
- WebSocket integration using Socket.io
- Live message broadcasting
- Connection state management

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization

### UI/UX
- Smooth animations and transitions
- Responsive design for all devices
- Dark theme with modern aesthetics
- Loading states and error handling
- Intuitive chat management

### AI Integration
- Support for multiple AI providers
- Dynamic model selection
- Streaming responses (if supported by provider)
- Error handling for API failures

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing AI capabilities
- Anthropic for Claude AI model
- React community for excellent documentation
- Contributors and testers
"# AI-Chat-Application-MERN-Stack" 
