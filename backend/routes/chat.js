import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import Channel from '../models/Channel.js';
import { validateObjectId, validatePagination, validateChatMessage } from '../middleware/validation.js';

const router = express.Router();

// Get chat messages for a channel
router.get('/:channelId', validateObjectId, validatePagination, async (req, res) => {
  try {
    const { channelId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Get messages with pagination (newest first)
    const messages = await ChatMessage.find({
      channelId,
      isDeleted: false
    })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments({
      channelId,
      isDeleted: false
    });

    // Reverse to show oldest first in the response
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      data: reversedMessages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages'
    });
  }
});

// Send a chat message
router.post('/:channelId', validateObjectId, validateChatMessage, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { message } = req.body;

    // Check if channel exists and is active
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    if (!channel.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Channel is not active'
      });
    }

    // Create chat message
    const chatMessage = new ChatMessage({
      channelId,
      userId: req.user._id,
      username: req.user.username,
      message: message.trim(),
      messageType: 'text'
    });

    await chatMessage.save();
    await chatMessage.populate('userId', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Edit a chat message
router.put('/message/:messageId', validateObjectId, validateChatMessage, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    const chatMessage = await ChatMessage.findById(messageId);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user owns the message
    if (chatMessage.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is not too old (e.g., 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (chatMessage.createdAt < fiveMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Message is too old to edit'
      });
    }

    await chatMessage.editMessage(message.trim());
    await chatMessage.populate('userId', 'username avatar');

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message'
    });
  }
});

// Delete a chat message
router.delete('/message/:messageId', validateObjectId, async (req, res) => {
  try {
    const { messageId } = req.params;

    const chatMessage = await ChatMessage.findById(messageId);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user owns the message or is admin
    if (chatMessage.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    await chatMessage.softDelete();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

// Get chat statistics for a channel (Admin only)
router.get('/:channelId/stats', validateObjectId, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { channelId } = req.params;

    const [
      totalMessages,
      activeMessages,
      deletedMessages,
      uniqueUsers
    ] = await Promise.all([
      ChatMessage.countDocuments({ channelId }),
      ChatMessage.countDocuments({ channelId, isDeleted: false }),
      ChatMessage.countDocuments({ channelId, isDeleted: true }),
      ChatMessage.distinct('userId', { channelId })
    ]);

    // Get messages per day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messagesPerDay = await ChatMessage.aggregate([
      {
        $match: {
          channelId: channelId,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalMessages,
        activeMessages,
        deletedMessages,
        uniqueUsers: uniqueUsers.length,
        messagesPerDay
      }
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics'
    });
  }
});

// Add reaction to message
router.post('/message/:messageId/reaction', validateObjectId, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const chatMessage = await ChatMessage.findById(messageId);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = chatMessage.reactions.find(
      reaction => reaction.userId.toString() === req.user._id.toString() && reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      chatMessage.reactions = chatMessage.reactions.filter(
        reaction => !(reaction.userId.toString() === req.user._id.toString() && reaction.emoji === emoji)
      );
    } else {
      // Add reaction
      chatMessage.reactions.push({
        userId: req.user._id,
        emoji
      });
    }

    await chatMessage.save();

    res.json({
      success: true,
      message: existingReaction ? 'Reaction removed' : 'Reaction added',
      data: chatMessage.reactions
    });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle reaction'
    });
  }
});

export default router;