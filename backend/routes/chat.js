// routes/chat.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all chats for user
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chats = await Chat.find({ 
      user: req.user.userId,
      isActive: true 
    })
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit)
    .select('title model lastActivity createdAt totalTokens');

    const total = await Chat.countDocuments({ 
      user: req.user.userId,
      isActive: true 
    });

    res.json({
      success: true,
      chats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific chat
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      user: req.user.userId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new chat
router.post('/', auth, [
  body('title').optional().isLength({ min: 1, max: 100 }).trim(),
  body('model').optional().isIn([
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-sonnet',
    'meta-llama/llama-3.1-8b-instruct',
    'mistralai/mistral-7b-instruct'
  ])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    const { title, model } = req.body;

    const chat = new Chat({
      title: title || 'New Chat',
      user: req.user.userId,
      model: model || user.preferredModel,
      messages: []
    });

    await chat.save();

    // Add chat to user's chats array
    user.chats.push(chat._id);
    await user.save();

    res.status(201).json({
      success: true,
      chat: {
        _id: chat._id,
        title: chat.title,
        model: chat.model,
        messages: chat.messages,
        createdAt: chat.createdAt
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add message to chat
router.post('/:chatId/messages', auth, [
  body('content').isLength({ min: 1 }).trim(),
  body('role').isIn(['user', 'assistant', 'system']),
  body('model').optional().isString(),
  body('tokens').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, role, model, tokens } = req.body;
    
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      user: req.user.userId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = {
      role,
      content,
      timestamp: new Date(),
      ...(role === 'assistant' && { model }),
      tokens: tokens || 0
    };

    chat.messages.push(message);
    chat.calculateTotalTokens();
    
    // Auto-generate title from first user message if title is "New Chat"
    if (chat.title === 'New Chat' && role === 'user' && chat.messages.length === 1) {
      chat.title = chat.generateTitle();
    }

    await chat.save();

    // Emit real-time update
    req.io.to(req.params.chatId).emit('new-message', {
      chatId: chat._id,
      message: message
    });

    res.status(201).json({
      success: true,
      message,
      chat: {
        _id: chat._id,
        title: chat.title,
        totalTokens: chat.totalTokens
      }
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update chat title
router.put('/:chatId', auth, [
  body('title').isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title } = req.body;

    const chat = await Chat.findOneAndUpdate(
      {
        _id: req.params.chatId,
        user: req.user.userId,
        isActive: true
      },
      { title },
      { new: true }
    ).select('title model lastActivity createdAt totalTokens');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete chat
router.delete('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      {
        _id: req.params.chatId,
        user: req.user.userId,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;