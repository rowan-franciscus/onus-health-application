const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Email Queue Schema
 * Stores emails that need to be sent, including retry information
 */
const EmailQueueSchema = new Schema({
  // Email recipient information
  to: {
    type: String,
    required: true,
    trim: true
  },
  from: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  // Content
  html: {
    type: String,
    required: true
  },
  text: {
    type: String
  },
  // Processing metadata
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 0, // 0 = normal, 1 = high, 2 = urgent
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  lastAttempt: {
    type: Date
  },
  nextAttempt: {
    type: Date
  },
  error: {
    type: String
  },
  // Relation to user (optional)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Template information
  template: {
    type: String
  },
  templateData: {
    type: Object
  },
  // Audit information
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
EmailQueueSchema.index({ status: 1, nextAttempt: 1 });
EmailQueueSchema.index({ userId: 1 });

const EmailQueue = mongoose.model('EmailQueue', EmailQueueSchema);

module.exports = EmailQueue; 