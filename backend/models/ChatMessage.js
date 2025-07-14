import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  messageType: {
    type: String,
    enum: ['text', 'emoji', 'system'],
    default: 'text'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
chatMessageSchema.index({ channelId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1 });
chatMessageSchema.index({ createdAt: -1 });

// Virtual for message display
chatMessageSchema.virtual('displayMessage').get(function() {
  if (this.isDeleted) {
    return '[Message deleted]';
  }
  return this.message;
});

// Method to soft delete message
chatMessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method to edit message
chatMessageSchema.methods.editMessage = function(newMessage) {
  this.message = newMessage;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

export default mongoose.model('ChatMessage', chatMessageSchema);