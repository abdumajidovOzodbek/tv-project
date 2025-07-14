import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Channel from '../models/Channel.js';
import ChatMessage from '../models/ChatMessage.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateObjectId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', requireAdmin, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { role, isActive, search } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('favoriteChannels', 'name thumbnail category');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Check if username or email already exists (excluding current user)
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [{ username }, { email }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get single user (Admin only)
router.get('/:id', requireAdmin, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('favoriteChannels', 'name thumbnail category');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user (Admin only)
router.put('/:id', requireAdmin, validateObjectId, async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;
    
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Check if username or email already exists (excluding current user)
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.params.id } },
        { $or: [{ username }, { email }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', requireAdmin, validateObjectId, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      onlineUsers,
      totalChannels,
      activeChannels,
      totalMessages
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isOnline: true }),
      Channel.countDocuments(),
      Channel.countDocuments({ isActive: true }),
      ChatMessage.countDocuments()
    ]);

    // Get user registration stats for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        onlineUsers,
        totalChannels,
        activeChannels,
        totalMessages,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Add channel to favorites
router.post('/favorites/:channelId', validateObjectId, async (req, res) => {
  try {
    const channelId = req.params.channelId;
    
    // Check if channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if already in favorites
    if (req.user.favoriteChannels.includes(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Channel already in favorites'
      });
    }

    req.user.favoriteChannels.push(channelId);
    await req.user.save();

    res.json({
      success: true,
      message: 'Channel added to favorites'
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add channel to favorites'
    });
  }
});

// Remove channel from favorites
router.delete('/favorites/:channelId', validateObjectId, async (req, res) => {
  try {
    const channelId = req.params.channelId;
    
    req.user.favoriteChannels = req.user.favoriteChannels.filter(
      id => id.toString() !== channelId
    );
    await req.user.save();

    res.json({
      success: true,
      message: 'Channel removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove channel from favorites'
    });
  }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', requireAdmin, validateObjectId, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

export default router;