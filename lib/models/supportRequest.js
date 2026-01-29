const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const SupportRequest = new mongoose.Schema({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'SupportCategory'
  },
  supportFields: {
    type: Array
  },
  content: {
    type: String
  },
  attachments: {
    type: Array,
    default: []
  },
  status: {
    type: Number,
    default: 0
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: 'Member'
  },
  createdAt: {
    type: Number,
    default: Date.now
  },
  updatedAt: {
    type: Number,
    default: Date.now
  }
}, {id: false, versionKey: false});

module.exports = mongoConnections('master').model('SupportRequest', SupportRequest);
