const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConnections = require('../connections/mongo');

const EmailVerificationTokenSchema = new mongoose.Schema({
  member: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Number,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Number,
    default: Date.now
  }
}, { id: false, versionKey: false });

// Index để tự động xóa các token đã hết hạn
EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoConnections('master').model('EmailVerificationToken', EmailVerificationTokenSchema);
