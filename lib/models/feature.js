const mongoose = require('mongoose');
const mongoConnections = require('../connections/mongo');

const FeatureSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },

  displayName: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: ''
  },

  order: { type: Number, default: 0 }, // thứ tự hiển thị

  status: { type: Number, default: 1 }, // 0: inactive, 1: active

  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now }
}, { versionKey: false });

module.exports = mongoConnections('master').model('Feature', FeatureSchema);