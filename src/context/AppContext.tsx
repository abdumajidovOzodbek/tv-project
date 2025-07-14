import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Channel, ChatMessage } from '../types';
import { channelAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface AppContextType {
  state: AppState;
  setCurrentChannel: (channel: Channel | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChannels: (channels: Channel[]) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const appReducer = (state: AppState, action: any): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_CHANNEL':
      return { ...state, currentChannel: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.payload };
    case 'UPDATE_CHANNELS':
      return { ...state, channels: action.payload };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(appReducer, {
    channels: [],
    currentChannel: null,
    chatMessages: [],
    onlineUsers: [],
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  });

  useEffect(() => {
    if (authState.token) {
      loadChannels();
    }
  }, [authState.token]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  const loadChannels = async () => {
    try {
      const channels = await channelAPI.getAll();
      dispatch({ type: 'UPDATE_CHANNELS', payload: channels });
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const setCurrentChannel = (channel: Channel | null) => {
    dispatch({ type: 'SET_CURRENT_CHANNEL', payload: channel });
    if (channel) {
      dispatch({ type: 'SET_CHAT_MESSAGES', payload: [] });
    }
  };

  const addChatMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
  };

  const updateChannels = (channels: Channel[]) => {
    dispatch({ type: 'UPDATE_CHANNELS', payload: channels });
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  return (
    <AppContext.Provider value={{
      state,
      setCurrentChannel,
      addChatMessage,
      updateChannels,
      toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};