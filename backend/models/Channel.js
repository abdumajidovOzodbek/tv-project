import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 50
  },
  streamUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(m3u8|mpd)(\?.*)?$/i.test(v);
      },
      message: 'Stream URL must be a valid .m3u8 or .mpd URL'
    }
  },
  thumbnail: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v);
      },
      message: 'Thumbnail must be a valid image URL'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  quality: {
    type: String,
    enum: ['SD', 'HD', '4K'],
    default: 'HD'
  },
  language: {
    type: String,
    default: 'English',
    maxlength: 50
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
channelSchema.index({ category: 1 });
channelSchema.index({ isActive: 1 });
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ createdAt: -1 });

// Virtual for channel stats
channelSchema.virtual('stats').get(function() {
  return {
    viewerCount: this.viewerCount,
    totalViews: this.totalViews,
    isLive: this.isActive
  };
});

// Pre-save middleware to update lastUpdated
channelSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

export default mongoose.model('Channel', channelSchema);