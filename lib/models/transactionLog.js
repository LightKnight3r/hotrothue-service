const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')

const TransactionLog = new mongoose.Schema({
  member: {
    type: Schema.Types.ObjectId
  },
  region: {
    type: String,
    default: ''
  },
  data: {
    type: Schema.Types.Mixed
  },
  message: {
    type: String,
    default: ''
  },
  isRefund: {
    type: Number
  },
  createdAt: {
    type: Number,
    default: Date.now
  }
}, {id: false, versionKey: false, strict: false});

module.exports = mongoConnections('master').model('TransactionLog', TransactionLog);
