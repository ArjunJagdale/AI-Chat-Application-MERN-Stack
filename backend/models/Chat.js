// models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  model: {
    type: String,
    required: function() {
      return this.role === 'assistant';
    }
  },
  tokens: {
    type: Number,
    default: 0
  }
});

const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [messageSchema],
  model: {
    type: String,
    required: true,
    default: 'openai/gpt-3.5-turbo'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastActivity on message add
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = Date.now();
  }
  next();
});

// Generate title from first message if not provided
chatSchema.methods.generateTitle = function() {
  if (this.messages.length > 0) {
    const firstUserMessage = this.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  return 'New Chat';
};

// Calculate total tokens
chatSchema.methods.calculateTotalTokens = function() {
  this.totalTokens = this.messages.reduce((total, msg) => total + (msg.tokens || 0), 0);
  return this.totalTokens;
};

module.exports = mongoose.model('Chat', chatSchema);