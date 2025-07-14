import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Users } from 'lucide-react';
import { Channel, ChatMessage } from '../../types';
import VideoPlayer from './VideoPlayer';
import ChatPanel from '../Chat/ChatPanel';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface ChannelPlayerProps {
  channel: Channel;
  onClose: () => void;
}

const ChannelPlayer: React.FC<ChannelPlayerProps> = ({ channel, onClose }) => {
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const { state: authState } = useAuth();
  const { addChatMessage } = useApp();

  useEffect(() => {
    if (authState.token) {
      // Connect to socket if not connected
      if (!socketService.getSocket()) {
        socketService.connect(authState.token);
      }

      // Join channel
      socketService.joinChannel(channel.id);

      // Listen for messages
      socketService.onMessage((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        addChatMessage(message);
      });

      // Listen for user events
      socketService.onUserJoined((data) => {
        setOnlineUsers(prev => prev + 1);
      });

      socketService.onUserLeft((data) => {
        setOnlineUsers(prev => Math.max(0, prev - 1));
      });

      return () => {
        socketService.leaveChannel(channel.id);
      };
    }
  }, [channel.id, authState.token]);

  const handleSendMessage = (message: string) => {
    socketService.sendMessage(channel.id, message);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {/* Video Player */}
      <div className={`flex-1 ${showChat ? 'mr-80' : ''} transition-all duration-300`}>
        <VideoPlayer channel={channel} onBack={onClose} />
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 h-full">
          <ChatPanel
            channelId={channel.id}
            messages={messages}
            onSendMessage={handleSendMessage}
            onlineUsers={onlineUsers}
          />
        </div>
      )}

      {/* Chat Toggle Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-all duration-200"
      >
        {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChannelPlayer;