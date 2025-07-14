import ChatMessage from '../models/ChatMessage.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';

// Store active connections
const activeConnections = new Map();
const channelViewers = new Map();

export const handleSocketConnection = (io, socket) => {
  console.log(`User ${socket.username} connected`);

  // Store connection
  activeConnections.set(socket.id, {
    userId: socket.userId,
    username: socket.username,
    role: socket.role,
    currentChannel: null
  });

  // Update user online status
  updateUserOnlineStatus(socket.userId, true);

  // Handle joining a channel
  socket.on('join-channel', async (channelId) => {
    try {
      // Leave previous channel if any
      const connection = activeConnections.get(socket.id);
      if (connection.currentChannel) {
        await leaveChannel(socket, connection.currentChannel);
      }

      // Join new channel
      await joinChannel(socket, channelId);
      
    } catch (error) {
      console.error('Join channel error:', error);
      socket.emit('error', { message: 'Failed to join channel' });
    }
  });

  // Handle leaving a channel
  socket.on('leave-channel', async (channelId) => {
    try {
      await leaveChannel(socket, channelId);
    } catch (error) {
      console.error('Leave channel error:', error);
    }
  });

  // Handle sending a message
  socket.on('send-message', async (data) => {
    try {
      const { channelId, message } = data;
      
      if (!channelId || !message || !message.trim()) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Check if channel exists and is active
      const channel = await Channel.findById(channelId);
      if (!channel || !channel.isActive) {
        socket.emit('error', { message: 'Channel not found or inactive' });
        return;
      }

      // Create and save message
      const chatMessage = new ChatMessage({
        channelId,
        userId: socket.userId,
        username: socket.username,
        message: message.trim(),
        messageType: 'text'
      });

      await chatMessage.save();

      // Broadcast message to all users in the channel
      io.to(`channel-${channelId}`).emit('new-message', {
        id: chatMessage._id,
        channelId: chatMessage.channelId,
        userId: chatMessage.userId,
        username: chatMessage.username,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt
      });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { channelId, isTyping } = data;
    
    if (channelId) {
      socket.to(`channel-${channelId}`).emit('typing', {
        username: socket.username,
        channelId,
        isTyping
      });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    console.log(`User ${socket.username} disconnected`);
    
    try {
      const connection = activeConnections.get(socket.id);
      
      if (connection && connection.currentChannel) {
        await leaveChannel(socket, connection.currentChannel);
      }

      // Remove from active connections
      activeConnections.delete(socket.id);

      // Check if user has other active connections
      const userConnections = Array.from(activeConnections.values())
        .filter(conn => conn.userId === socket.userId);

      // If no other connections, mark user as offline
      if (userConnections.length === 0) {
        await updateUserOnlineStatus(socket.userId, false);
      }

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  // Handle message reactions
  socket.on('toggle-reaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      
      const chatMessage = await ChatMessage.findById(messageId);
      if (!chatMessage) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user already reacted with this emoji
      const existingReaction = chatMessage.reactions.find(
        reaction => reaction.userId.toString() === socket.userId && reaction.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        chatMessage.reactions = chatMessage.reactions.filter(
          reaction => !(reaction.userId.toString() === socket.userId && reaction.emoji === emoji)
        );
      } else {
        // Add reaction
        chatMessage.reactions.push({
          userId: socket.userId,
          emoji
        });
      }

      await chatMessage.save();

      // Broadcast reaction update to channel
      io.to(`channel-${chatMessage.channelId}`).emit('reaction-updated', {
        messageId,
        reactions: chatMessage.reactions
      });

    } catch (error) {
      console.error('Toggle reaction error:', error);
      socket.emit('error', { message: 'Failed to toggle reaction' });
    }
  });
};

// Helper function to join a channel
async function joinChannel(socket, channelId) {
  // Validate channel
  const channel = await Channel.findById(channelId);
  if (!channel || !channel.isActive) {
    socket.emit('error', { message: 'Channel not found or inactive' });
    return;
  }

  // Join socket room
  socket.join(`channel-${channelId}`);

  // Update connection info
  const connection = activeConnections.get(socket.id);
  if (connection) {
    connection.currentChannel = channelId;
  }

  // Update channel viewer count
  if (!channelViewers.has(channelId)) {
    channelViewers.set(channelId, new Set());
  }
  channelViewers.get(channelId).add(socket.userId);

  // Update database viewer count
  const viewerCount = channelViewers.get(channelId).size;
  await Channel.findByIdAndUpdate(channelId, { 
    viewerCount,
    $inc: { totalViews: 1 }
  });

  // Notify channel about new user
  socket.to(`channel-${channelId}`).emit('user-joined', {
    username: socket.username,
    channelId,
    viewerCount
  });

  // Send current viewer count to user
  socket.emit('viewer-count-updated', {
    channelId,
    viewerCount
  });

  console.log(`User ${socket.username} joined channel ${channelId}`);
}

// Helper function to leave a channel
async function leaveChannel(socket, channelId) {
  // Leave socket room
  socket.leave(`channel-${channelId}`);

  // Update connection info
  const connection = activeConnections.get(socket.id);
  if (connection) {
    connection.currentChannel = null;
  }

  // Update channel viewer count
  if (channelViewers.has(channelId)) {
    channelViewers.get(channelId).delete(socket.userId);
    
    const viewerCount = channelViewers.get(channelId).size;
    
    // Update database viewer count
    await Channel.findByIdAndUpdate(channelId, { viewerCount });

    // Notify channel about user leaving
    socket.to(`channel-${channelId}`).emit('user-left', {
      username: socket.username,
      channelId,
      viewerCount
    });

    // Clean up empty viewer sets
    if (viewerCount === 0) {
      channelViewers.delete(channelId);
    }
  }

  console.log(`User ${socket.username} left channel ${channelId}`);
}

// Helper function to update user online status
async function updateUserOnlineStatus(userId, isOnline) {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date()
    });
  } catch (error) {
    console.error('Update user online status error:', error);
  }
}

// Get online users count
export function getOnlineUsersCount() {
  const uniqueUsers = new Set();
  activeConnections.forEach(connection => {
    uniqueUsers.add(connection.userId);
  });
  return uniqueUsers.size;
}

// Get channel viewer count
export function getChannelViewerCount(channelId) {
  return channelViewers.has(channelId) ? channelViewers.get(channelId).size : 0;
}

// Broadcast system message to channel
export function broadcastSystemMessage(io, channelId, message) {
  io.to(`channel-${channelId}`).emit('system-message', {
    channelId,
    message,
    timestamp: new Date()
  });
}