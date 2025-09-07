// src/components/ClaudeInterface.js
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
  Plus,
  Send,
  Bot,
  User,
  Settings,
  Loader,
  Copy,
  Check,
  MessageSquare,
  LogOut,
  ChevronDown,
  MoreVertical,
  Trash2,
  Menu,
  X,
  Edit3,
  Save,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ClaudeInterface() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { joinChat, leaveChat, onNewMessage } = useSocket();
  
  // Chat state
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  // Dashboard state
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Chat editing state
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    fetchChats();
    fetchAvailableModels();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChat();
      joinChat(chatId);

      // Listen for real-time messages
      const cleanup = onNewMessage((data) => {
        if (data.chatId === chatId) {
          setMessages(prev => {
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
    } else {
      // Clear chat state when no chat is selected
      setChat(null);
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus edit input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const fetchChats = async () => {
    try {
      const response = await axios.get('/api/chat');
      setChats(response.data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchChat = async () => {
    try {
      const response = await axios.get(`/api/chat/${chatId}`);
      const chatData = response.data.chat;
      setChat(chatData);
      setMessages(chatData.messages || []);
      setSelectedModel(chatData.model);
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast.error('Failed to load chat');
      navigate('/');
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get('/api/ai/models');
      setAvailableModels(response.data.models);
      // Set default model if none selected
      if (!selectedModel && Object.keys(response.data.models).length > 0) {
        setSelectedModel(Object.keys(response.data.models)[0]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await axios.post('/api/chat', {
        title: 'New Chat'
      });
      
      const newChat = response.data.chat;
      setChats(prev => [newChat, ...prev]);
      navigate(`/chat/${newChat._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const deleteChat = async (chatIdToDelete, e) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await axios.delete(`/api/chat/${chatIdToDelete}`);
        setChats(chats.filter(chat => chat._id !== chatIdToDelete));
        
        // If we're currently viewing the deleted chat, navigate away
        if (chatId === chatIdToDelete) {
          navigate('/');
        }
        
        toast.success('Chat deleted successfully');
      } catch (error) {
        console.error('Error deleting chat:', error);
        toast.error('Failed to delete chat');
      }
    }
  };

  const startEditingChat = (chatItem, e) => {
    e.stopPropagation();
    setEditingChatId(chatItem._id);
    setEditingChatTitle(chatItem.title);
  };

  const saveEditingChat = async () => {
    if (!editingChatTitle.trim()) {
      toast.error('Chat title cannot be empty');
      return;
    }

    try {
      const response = await axios.put(`/api/chat/${editingChatId}`, {
        title: editingChatTitle.trim()
      });

      // Update chats list
      setChats(prev => prev.map(chat => 
        chat._id === editingChatId 
          ? { ...chat, title: editingChatTitle.trim() }
          : chat
      ));

      // Update current chat if it's the one being edited
      if (chat && chat._id === editingChatId) {
        setChat(prev => ({ ...prev, title: editingChatTitle.trim() }));
      }

      setEditingChatId(null);
      setEditingChatTitle('');
      toast.success('Chat title updated');
    } catch (error) {
      console.error('Error updating chat title:', error);
      toast.error('Failed to update chat title');
    }
  };

  const cancelEditingChat = () => {
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditingChat();
    } else if (e.key === 'Escape') {
      cancelEditingChat();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending || !chatId) return;

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
      setInputMessage(messageText);
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

  // Helper function to safely format date with validation
  const formatChatDate = (dateValue) => {
    if (!dateValue) {
      return 'No recent activity';
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Dynamic background particles */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-orange-400/10 rounded-full animate-float"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 10 + 's',
                animationDuration: Math.random() * 10 + 10 + 's'
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent absolute top-0 left-0 animate-reverse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex overflow-hidden relative">
      {/* Dynamic animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-r from-orange-400/5 to-orange-600/5 rounded-full animate-float blur-sm"
              style={{
                width: Math.random() * 6 + 3 + 'px',
                height: Math.random() * 6 + 3 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 20 + 's',
                animationDuration: Math.random() * 15 + 15 + 's'
              }}
            />
          ))}
          
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '5s'}} />
        </div>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-800/80 backdrop-blur-xl flex flex-col border-r border-gray-700/50 transition-all duration-500 ease-out overflow-hidden relative z-10`}>
        <div className={`w-64 flex flex-col transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
          {/* Header with New Chat */}
          <div className="p-4 border-b border-gray-700/50">
            <button
              onClick={createNewChat}
              className="group w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span>New chat</span>
            </button>
          </div>

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <div className="mb-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide animate-fade-in">
              Recent Chats
            </div>
            
            <div className="space-y-1">
              {chats.map((chatItem, index) => (
                <div
                  key={chatItem._id}
                  onClick={() => !editingChatId && navigate(`/chat/${chatItem._id}`)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:translate-x-1 animate-slide-in ${
                    chatId === chatItem._id 
                      ? 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 backdrop-blur text-white shadow-lg border border-gray-600/50 translate-x-1' 
                      : 'hover:bg-gray-700/50 text-gray-300 hover:text-white hover:shadow-md hover:backdrop-blur'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-orange-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                      {editingChatId === chatItem._id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingChatTitle}
                          onChange={(e) => setEditingChatTitle(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-sm font-medium bg-gray-600/80 backdrop-blur text-white px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                        />
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {chatItem.title}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatChatDate(chatItem.lastActivity)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {editingChatId === chatItem._id ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEditingChat();
                          }}
                          className="p-1 text-green-400 hover:text-green-300 transition-all duration-200 hover:scale-110 animate-bounce"
                          title="Save"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditingChat();
                          }}
                          className="p-1 text-gray-400 hover:text-gray-300 transition-all duration-200 hover:scale-110"
                          title="Cancel"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => startEditingChat(chatItem, e)}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:rotate-12"
                          title="Edit title"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => deleteChat(chatItem._id, e)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110 hover:-rotate-12"
                          title="Delete chat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {chats.length === 0 && (
              <div className="text-center py-8 text-gray-500 animate-pulse">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50 animate-float" />
                <p className="text-sm">No chats yet</p>
                <p className="text-xs text-gray-600 mt-1">Start a conversation to begin</p>
              </div>
            )}
          </div>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-700/50">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300 transform hover:scale-[1.02] backdrop-blur"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-orange-500/25 animate-glow">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full animate-ping-slow"></div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">{user?.username}</div>
                    <div className="text-xs text-gray-400">Free plan</div>
                  </div>
                </div>
                <MoreVertical className="h-4 w-4 text-gray-400 transition-transform duration-300 hover:rotate-90" />
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600/50 z-50 animate-dropdown">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-600/50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center space-x-3 h-full">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center backdrop-blur"
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5 transition-transform duration-300 rotate-0 hover:rotate-90" />
              ) : (
                <Menu className="h-5 w-5 transition-transform duration-300 rotate-0 hover:rotate-12" />
              )}
            </button>
            <div className="h-6 w-px bg-gray-700/50"></div>
            <h1 className="text-lg font-semibold animate-fade-in">
              {chatId ? (chat?.title || 'Chat') : 'Claude AI Assistant'}
            </h1>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700/80 hover:bg-gray-600/80 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur transform hover:scale-[1.02]"
            >
              <span className="text-sm font-medium">
                {availableModels[selectedModel]?.name || selectedModel || 'Claude Sonnet 4'}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showModelSelector ? 'rotate-180' : ''}`} />
            </button>

            {showModelSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-700/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600/50 z-50 animate-dropdown">
                <div className="p-3 border-b border-gray-600/50">
                  <h3 className="font-semibold text-white">Select Model</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(availableModels).map(([key, model], index) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedModel(key);
                        setShowModelSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-600/50 transition-all duration-200 hover:scale-[1.02] first:rounded-t-xl last:rounded-b-xl focus:outline-none animate-slide-in ${
                        selectedModel === key ? 'bg-gray-600/70 text-orange-400' : 'text-gray-300'
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-gray-400">{model.provider}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent via-transparent to-gray-900/20">
          {!chatId ? (
            // Welcome screen when no chat selected
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-lg mx-auto p-8 animate-fade-in-up">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-glow">
                    <Bot className="h-10 w-10 text-white animate-float" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mx-auto opacity-20 animate-ping-slow"></div>
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-text-shimmer">
                  How can I help you today?
                </h2>
                <p className="text-gray-400 mb-8 text-lg leading-relaxed animate-fade-in">
                  Start a new conversation or continue with one of your recent chats.
                </p>
                <button
                  onClick={createNewChat}
                  className="group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 active:scale-95 animate-bounce-subtle"
                >
                  <span className="flex items-center space-x-2">
                    <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                    <span>Start new chat</span>
                  </span>
                </button>
              </div>
            </div>
          ) : (
            // Chat messages
            <div className="px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in-up">
                    <Bot className="h-16 w-16 text-gray-600 mx-auto mb-6 animate-bounce-slow" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">
                      Start a conversation
                    </h3>
                    <p className="text-gray-500 text-lg">
                      Send a message to begin chatting with AI
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div 
                      key={index} 
                      className="flex items-start space-x-4 animate-message-appear"
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 animate-glow ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-5 w-5 text-white" />
                        ) : (
                          <Bot className="h-5 w-5 text-white animate-float" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="font-semibold text-gray-200 text-lg">
                            {message.role === 'user' ? user?.username : 'Claude'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-700/50 backdrop-blur px-2 py-1 rounded-full">
                            {formatTimestamp(message.timestamp)}
                          </span>
                          {message.model && (
                            <span className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full animate-glow">
                              {availableModels[message.model]?.name || message.model}
                            </span>
                          )}
                        </div>

                        <div className={`group rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl backdrop-blur border animate-message-slide ${
                          message.role === 'user' 
                            ? 'bg-blue-600/10 border-blue-500/20 hover:border-blue-400/30 hover:bg-blue-600/15' 
                            : 'bg-gray-700/30 border-gray-600/30 hover:border-gray-500/50 hover:bg-gray-700/40'
                        }`}>
                          {message.role === 'user' ? (
                            <p className="text-gray-100 whitespace-pre-wrap leading-relaxed text-lg">
                              {message.content}
                            </p>
                          ) : (
                            <div className="prose prose-lg max-w-none">
                              <ReactMarkdown
                                components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <div className="my-4 group">
                                        <SyntaxHighlighter
                                          style={tomorrow}
                                          language={match[1]}
                                          PreTag="div"
                                          className="rounded-xl shadow-lg border border-gray-600/50 backdrop-blur transition-all duration-300 group-hover:border-gray-500/70"
                                          {...props}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      </div>
                                    ) : (
                                      <code className={`${className} bg-gray-800/80 backdrop-blur border border-gray-600/50 px-2 py-1 rounded-md text-orange-300 text-sm font-mono transition-all duration-200 hover:bg-gray-700/80`} {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({children}) => <p className="text-gray-100 mb-4 last:mb-0 leading-relaxed text-lg">{children}</p>,
                                  h1: ({children}) => <h1 className="text-gray-100 text-3xl font-bold mb-6 border-b border-gray-600/50 pb-2">{children}</h1>,
                                  h2: ({children}) => <h2 className="text-gray-100 text-2xl font-bold mb-4 text-orange-400">{children}</h2>,
                                  h3: ({children}) => <h3 className="text-gray-100 text-xl font-bold mb-3 text-orange-300">{children}</h3>,
                                  ul: ({children}) => <ul className="text-gray-100 list-disc list-inside mb-6 space-y-2 ml-4">{children}</ul>,
                                  ol: ({children}) => <ol className="text-gray-100 list-decimal list-inside mb-6 space-y-2 ml-4">{children}</ol>,
                                  li: ({children}) => <li className="text-gray-100 leading-relaxed">{children}</li>,
                                  blockquote: ({children}) => (
                                    <blockquote className="border-l-4 border-orange-500 pl-6 text-gray-300 italic mb-6 bg-gray-800/30 backdrop-blur py-4 rounded-r-lg transition-all duration-300 hover:bg-gray-700/30">
                                      {children}
                                    </blockquote>
                                  ),
                                  table: ({children}) => (
                                    <div className="overflow-x-auto mb-6">
                                      <table className="min-w-full border border-gray-600/50 backdrop-blur rounded-lg overflow-hidden">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  th: ({children}) => (
                                    <th className="bg-gray-700/80 backdrop-blur text-gray-100 px-4 py-3 text-left font-semibold border-b border-gray-600/50">
                                      {children}
                                    </th>
                                  ),
                                  td: ({children}) => (
                                    <td className="bg-gray-800/30 backdrop-blur text-gray-100 px-4 py-3 border-b border-gray-600/50">
                                      {children}
                                    </td>
                                  )
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* Copy button for AI messages */}
                          {message.role === 'assistant' && (
                            <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button
                                onClick={() => copyToClipboard(message.content, index)}
                                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-700/80 hover:bg-gray-600/80 backdrop-blur px-3 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                              >
                                {copiedMessageId === index ? (
                                  <>
                                    <Check className="h-4 w-4 text-green-400 animate-bounce" />
                                    <span className="text-green-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4" />
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
                  <div className="flex items-start space-x-4 animate-fade-in">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center shadow-lg animate-glow">
                      <Bot className="h-5 w-5 text-white animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="font-semibold text-gray-200 text-lg">Claude</span>
                      </div>
                      <div className="rounded-2xl p-6 bg-gray-700/30 backdrop-blur border border-gray-600/30 shadow-lg animate-pulse-border">
                        <div className="flex items-center space-x-3 text-gray-400">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                          <span className="text-lg">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area - only show when chat is selected */}
        {chatId && (
          <div className="border-t border-gray-700/50 p-6 bg-gray-800/30 backdrop-blur-xl flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-4">
                <div className="flex-1 relative group">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message Claude..."
                    disabled={isSending}
                    className="w-full px-6 py-4 bg-gray-700/80 backdrop-blur border border-gray-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none max-h-32 text-white placeholder-gray-400 disabled:opacity-50 text-lg shadow-lg transition-all duration-300 hover:shadow-xl focus:shadow-xl group-hover:border-gray-500/70 focus:bg-gray-700/90"
                    rows="1"
                    style={{
                      minHeight: '60px',
                      height: 'auto'
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-orange-600/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 pointer-events-none"></div>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className="group flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:hover:scale-100 animate-glow"
                >
                  {isSending ? (
                    <Loader className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-0.5" />
                  )}
                </button>
              </div>

              {/* Model indicator */}
              <div className="mt-3 text-sm text-gray-500 text-center animate-fade-in">
                <span className="inline-flex items-center space-x-1">
                  <span>Claude can make mistakes. Please double-check responses.</span>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-ping-slow"></div>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-reverse {
          animation-direction: reverse;
          animation-duration: 1s;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-ping-slow {
          animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite alternate;
        }
        
        .animate-text-shimmer {
          background-size: 200% auto;
          animation: text-shimmer 3s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
        
        .animate-dropdown {
          animation: dropdown 0.3s ease-out;
        }
        
        .animate-message-appear {
          animation: message-appear 0.6s ease-out;
        }
        
        .animate-message-slide {
          animation: message-slide 0.4s ease-out;
        }
        
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(-5px) rotate(-1deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(251, 146, 60, 0.2); }
          100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.4), 0 0 30px rgba(251, 146, 60, 0.2); }
        }
        
        @keyframes text-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in {
          from { 
            opacity: 0;
            transform: translateX(-10px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes dropdown {
          from { 
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes message-appear {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes message-slide {
          from { 
            transform: translateX(-5px);
            opacity: 0.8;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(75, 85, 99, 0.3); }
          50% { border-color: rgba(251, 146, 60, 0.3); }
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-thumb-gray-600 {
          scrollbar-color: #4b5563 transparent;
        }
        
        .scrollbar-track-transparent {
          scrollbar-track-color: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 2px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default ClaudeInterface;