// src/components/Chat.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Settings,
  Loader,
  Copy,
  Check,
  MoreVertical
} from 'lucide-react';

function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinChat, leaveChat, onNewMessage } = useSocket();
  
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (chatId) {
      fetchChat();
      fetchAvailableModels();
      joinChat(chatId);

      // Listen for real-time messages
      const cleanup = onNewMessage((data) => {
        if (data.chatId === chatId) {
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => 
              msg.timestamp === data.message.timestamp && 
              msg.content === data.message.content
            );
            if (!exists) {
              return [...prev, data.message];
            }
            return prev;
          });
        }
      });

      return () => {
        leaveChat(chatId);
        if (cleanup) cleanup();
      };
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChat = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/chat/${chatId}`);
      const chatData = response.data.chat;
      setChat(chatData);
      setMessages(chatData.messages || []);
      setSelectedModel(chatData.model);
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast.error('Failed to load chat');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get('/api/ai/models');
      setAvailableModels(response.data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      await axios.post('/api/ai/chat', {
        chatId,
        message: messageText,
        model: selectedModel
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInputMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {chat?.title || 'Chat'}
              </h1>
              <p className="text-sm text-gray-500">
                {availableModels[selectedModel]?.name || selectedModel}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>

            {showModelSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Select Model</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(availableModels).map(([key, model]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedModel(key);
                        setShowModelSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedModel === key ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-gray-500">{model.provider}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-600">
                Send a message to begin chatting with AI
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {message.role === 'user' ? user?.username : 'AI Assistant'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.model && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {availableModels[message.model]?.name || message.model}
                      </span>
                    )}
                  </div>

                  <div className={`prose max-w-none ${
                    message.role === 'user' 
                      ? 'bg-indigo-50 border border-indigo-200 rounded-lg p-4' 
                      : 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm'
                  }`}>
                    {message.role === 'user' ? (
                      <p className="text-gray-900 mb-0 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}

                    {/* Copy button for AI messages */}
                    {message.role === 'assistant' && (
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => copyToClipboard(message.content, index)}
                          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                        >
                          {copiedMessageId === index ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">AI Assistant</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin text-gray-500" />
                    <span className="text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none max-h-32 disabled:opacity-50"
                rows="1"
                style={{
                  minHeight: '48px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors duration-200"
            >
              {isSending ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Model indicator */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            Currently using: {availableModels[selectedModel]?.name || selectedModel}
          </div>
        </div>
      </div>

      {/* Click outside to close model selector */}
      {showModelSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowModelSelector(false)}
        />
      )}
    </div>
  );
}

export default Chat;