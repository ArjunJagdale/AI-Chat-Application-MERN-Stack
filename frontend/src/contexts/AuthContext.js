// src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    
    case 'AUTH_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...initialState,
        loading: false,
        token: null
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    
    default:
      return state;
  }
}

// Set up axios interceptor for token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const response = await axios.get('/api/auth/me');
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.data.user,
          token
        }
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: error.response?.data?.message || 'Authentication failed' });
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: response.data
      });
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, email, password) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: response.data
      });
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const updatePreferences = async (preferences) => {
    try {
      const response = await axios.put('/api/auth/preferences', preferences);
      dispatch({ type: 'UPDATE_USER', payload: response.data.user });
      toast.success('Preferences updated successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update preferences';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updatePreferences,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};