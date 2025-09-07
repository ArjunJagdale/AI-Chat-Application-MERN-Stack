// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User, 
  Bot,
  Trash2,
  Clock,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Dashboard() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState({});
  
  const { user, logout, updatePreferences } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
    fetchAvailableModels();
  }, []);

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

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get('/api/ai/models');
      setAvailableModels(response.data.models);
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
      navigate(`/chat/${newChat._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await axios.delete(`/api/chat/${chatId}`);
        setChats(chats.filter(chat => chat._id !== chatId));
        toast.success('Chat deleted successfully');
      } catch (error) {
        console.error('Error deleting chat:', error);
        toast.error('Failed to delete chat');
      }
    }
  };

  const handleModelChange = async (model) => {
    try {
      await updatePreferences({ preferredModel: model });
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating model preference:', error);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Claude Clone</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                </button>
                
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">Settings</h3>
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred AI Model
                        </label>
                        <select
                          value={user?.preferredModel || ''}
                          onChange={(e) => handleModelChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {Object.entries(availableModels).map(([key, model]) => (
                            <option key={key} value={key}>
                              {model.name} ({model.provider})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            logout();
                            setShowSettings(false);
                          }}
                          className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-gray-600">
            Start a new conversation or continue where you left off.
          </p>
        </div>

        {/* New Chat Button */}
        <div className="mb-8">
          <button
            onClick={createNewChat}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Start New Chat</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Chats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => navigate(`/chat/${chat._id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {availableModels[chat.model]?.name || chat.model}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => deleteChat(chat._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                    title="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {chat.title}
                </h3>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(chat.lastActivity), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {chat.totalTokens > 0 && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {chat.totalTokens} tokens
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No chats found' : 'No chats yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Start your first conversation with AI'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={createNewChat}
                  className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Chat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Click outside to close settings */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;