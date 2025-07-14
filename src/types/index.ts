export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  isOnline?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  category: string;
  streamUrl: string;
  thumbnail: string;
  isActive: boolean;
  createdAt: string;
  viewerCount?: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface AppState {
  channels: Channel[];
  currentChannel: Channel | null;
  chatMessages: ChatMessage[];
  onlineUsers: User[];
  theme: 'light' | 'dark';
}