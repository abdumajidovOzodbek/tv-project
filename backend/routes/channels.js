import express from 'express';
import Channel from '../models/Channel.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateChannel, validateObjectId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get all channels (with pagination and filtering)
router.get('/', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { category, search, isActive } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Get channels with pagination
    const channels = await Channel.find(filter)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Channel.countDocuments(filter);

    res.json({
      success: true,
      data: channels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channels'
    });
  }
});

// Get single channel
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channel'
    });
  }
});

// Create new channel (Admin only)
router.post('/', requireAdmin, validateChannel, async (req, res) => {
  try {
    const channelData = {
      ...req.body,
      createdBy: req.user._id
    };

    const channel = new Channel(channelData);
    await channel.save();

    await channel.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: channel
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create channel'
    });
  }
});

// Update channel (Admin only)
router.put('/:id', requireAdmin, validateObjectId, validateChannel, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      message: 'Channel updated successfully',
      data: channel
    });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update channel'
    });
  }
});

// Delete channel (Admin only)
router.delete('/:id', requireAdmin, validateObjectId, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete channel'
    });
  }
});

// Toggle channel status (Admin only)
router.patch('/:id/toggle', requireAdmin, validateObjectId, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    channel.isActive = !channel.isActive;
    channel.lastUpdated = new Date();
    await channel.save();

    res.json({
      success: true,
      message: `Channel ${channel.isActive ? 'activated' : 'deactivated'} successfully`,
      data: channel
    });
  } catch (error) {
    console.error('Toggle channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle channel status'
    });
  }
});

// Get channel categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Channel.distinct('category', { isActive: true });
    
    res.json({
      success: true,
      data: categories.sort()
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Update viewer count
router.patch('/:id/viewers', validateObjectId, async (req, res) => {
  try {
    const { action } = req.body; // 'join' or 'leave'
    
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    if (action === 'join') {
      channel.viewerCount += 1;
      channel.totalViews += 1;
    } else if (action === 'leave') {
      channel.viewerCount = Math.max(0, channel.viewerCount - 1);
    }

    await channel.save();

    res.json({
      success: true,
      data: {
        viewerCount: channel.viewerCount,
        totalViews: channel.totalViews
      }
    });
  } catch (error) {
    console.error('Update viewer count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update viewer count'
    });
  }
});

export default router;