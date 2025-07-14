import axios from 'axios';
import { User, Channel, ChatMessage } from '../types';

const API_BASE_URL = 'https://3d1ec4fe-deca-4e92-a36b-c24e61180a71-00-3ux8z4knca40w.pike.replit.dev/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  
  verifyToken: async (token: string): Promise<User> => {
    const response = await api.get('/auth/verify');
    return response.data.user;
  }
};

export const channelAPI = {
  getAll: async (): Promise<Channel[]> => {
    const response = await api.get('/channels');
    return response.data;
  },
  
  getById: async (id: string): Promise<Channel> => {
    const response = await api.get(`/channels/${id}`);
    return response.data;
  },
  
  create: async (channel: Partial<Channel>): Promise<Channel> => {
    const response = await api.post('/channels', channel);
    return response.data;
  },
  
  update: async (id: string, channel: Partial<Channel>): Promise<Channel> => {
    const response = await api.put(`/channels/${id}`, channel);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/channels/${id}`);
  }
};

export const chatAPI = {
  getMessages: async (channelId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/${channelId}`);
    return response.data;
  }
};

export const userAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  }
};
