// routes/ai.js
const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Available models configuration
const AVAILABLE_MODELS = {
  'openai/gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  'openai/gpt-4': { name: 'GPT-4', provider: 'OpenAI' },
  'anthropic/claude-3-haiku': { name: 'Claude 3 Haiku', provider: 'Anthropic' },
  'anthropic/claude-3-sonnet': { name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  'meta-llama/llama-3.1-8b-instruct': { name: 'Llama 3.1 8B', provider: 'Meta' },
  'mistralai/mistral-7b-instruct': { name: 'Mistral 7B', provider: 'Mistral AI' },
  'google/gemma-7b-it': { name: 'Gemma 7B', provider: 'Google' }
};

// Get available models
router.get('/models', auth, (req, res) => {
  res.json({
    success: true,
    models: AVAILABLE_MODELS
  });
});

// Send message to AI
router.post('/chat', auth, [
  body('chatId').isMongoId(),
  body('message').isLength({ min: 1 }).trim(),
  body('model').optional().isIn(Object.keys(AVAILABLE_MODELS))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chatId, message, model } = req.body;

    // Find the chat
    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user.userId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      tokens: Math.ceil(message.length / 4) // Rough token estimation
    };

    chat.messages.push(userMessage);
    await chat.save();

    // Emit user message in real-time
    req.io.to(chatId).emit('new-message', {
      chatId: chat._id,
      message: userMessage
    });

    // Prepare messages for OpenRouter API
    const apiMessages = chat.messages
      .filter(msg => msg.role !== 'system')
      .slice(-20) // Keep last 20 messages for context
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const selectedModel = model || chat.model;

    try {
      // Call OpenRouter API
      const response = await axios.post(OPENROUTER_URL, {
        model: selectedModel,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Claude Clone'
        }
      });

      const aiResponse = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens || 0;

      // Add AI response to chat
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        model: selectedModel,
        tokens: tokensUsed
      };

      chat.messages.push(assistantMessage);
      chat.calculateTotalTokens();
      await chat.save();

      // Emit AI response in real-time
      req.io.to(chatId).emit('new-message', {
        chatId: chat._id,
        message: assistantMessage
      });

      res.json({
        success: true,
        message: assistantMessage,
        usage: response.data.usage
      });

    } catch (apiError) {
      console.error('OpenRouter API error:', apiError.response?.data || apiError.message);
      
      // Add error message to chat
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        model: selectedModel,
        tokens: 0
      };

      chat.messages.push(errorMessage);
      await chat.save();

      req.io.to(chatId).emit('new-message', {
        chatId: chat._id,
        message: errorMessage
      });

      res.status(500).json({
        success: false,
        message: 'AI service temporarily unavailable',
        error: apiError.response?.data?.error?.message || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Stream chat response (for real-time streaming)
router.post('/stream', auth, [
  body('chatId').isMongoId(),
  body('message').isLength({ min: 1 }).trim(),
  body('model').optional().isIn(Object.keys(AVAILABLE_MODELS))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chatId, message, model } = req.body;

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user.userId,
      isActive: true
    });

    if (!chat) {
      res.write(`data: ${JSON.stringify({ error: 'Chat not found' })}\n\n`);
      res.end();
      return;
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      tokens: Math.ceil(message.length / 4)
    };

    chat.messages.push(userMessage);
    await chat.save();

    // Prepare messages for API
    const apiMessages = chat.messages
      .filter(msg => msg.role !== 'system')
      .slice(-20)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const selectedModel = model || chat.model;

    try {
      // Call OpenRouter with streaming
      const response = await axios.post(OPENROUTER_URL, {
        model: selectedModel,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Claude Clone'
        },
        responseType: 'stream'
      });

      let fullResponse = '';
      
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Save complete response to chat
              const assistantMessage = {
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date(),
                model: selectedModel,
                tokens: Math.ceil(fullResponse.length / 4)
              };

              chat.messages.push(assistantMessage);
              chat.calculateTotalTokens();
              chat.save();

              res.write(`data: ${JSON.stringify({ done: true, fullMessage: assistantMessage })}\n\n`);
              res.end();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ content, partial: true })}\n\n`);
              }
            } catch (parseError) {
              // Skip malformed JSON
            }
          }
        }
      });

      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`);
        res.end();
      });

    } catch (apiError) {
      console.error('OpenRouter streaming error:', apiError.response?.data || apiError.message);
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Stream chat error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Server error' })}\n\n`);
    res.end();
  }
});

module.exports = router;