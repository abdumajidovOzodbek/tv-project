import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    this.socket = io('http://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    return this.socket;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  joinChannel(channelId: string) {
    this.socket?.emit('join-channel', channelId);
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('leave-channel', channelId);
  }

  sendMessage(channelId: string, message: string) {
    this.socket?.emit('send-message', { channelId, message });
  }

  onMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: { username: string; channelId: string }) => void) {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { username: string; channelId: string }) => void) {
    this.socket?.on('user-left', callback);
  }

  onTyping(callback: (data: { username: string; channelId: string; isTyping: boolean }) => void) {
    this.socket?.on('typing', callback);
  }

  startTyping(channelId: string) {
    this.socket?.emit('typing', { channelId, isTyping: true });
  }

  stopTyping(channelId: string) {
    this.socket?.emit('typing', { channelId, isTyping: false });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();