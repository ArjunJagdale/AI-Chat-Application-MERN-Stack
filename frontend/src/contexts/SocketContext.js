// src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      socketRef.current = io('http://localhost:5000', {
        auth: {
          token: token
        }
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, token]);

  const joinChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-chat', chatId);
    }
  };

  const onNewMessage = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', callback);
      
      // Return cleanup function
      return () => {
        socketRef.current.off('new-message', callback);
      };
    }
  };

  const value = {
    socket: socketRef.current,
    joinChat,
    leaveChat,
    onNewMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};