const mongoose = require('mongoose');
const mongoConnections = require('../connections/mongo');

const FeaturePolicySchema = new mongoose.Schema({
  scopeValue: { type: String, enum: ['FREE', 'MEMBER'] },
  features: [{
    key: {
      type: String,
      required: true
    },
    access: { type: String, enum: ['none', 'limited', 'full'], default: 'none' },

    // nếu access = limited thì dùng quota
    quota: {
      // ví dụ: số lần/ngày, số doc/ngày, số câu hỏi/ngày...
      limit: { type: Number},
      window: { type: String, enum: ['day', 'week', 'month']},
    },

    note: { type: String, default: '' }
  }],

  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now }
}, { id: false, versionKey: false });

FeaturePolicySchema.index({ scopeType: 1, scopeValue: 1 }, { unique: true });

module.exports = mongoConnections('master').model('FeaturePolicy', FeaturePolicySchema);