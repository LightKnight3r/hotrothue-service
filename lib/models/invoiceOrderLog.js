const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConnections = require('../connections/mongo');

const InvoiceOrderLog = new mongoose.Schema({
  order: {
    type: Schema.Types.ObjectId
  },
  action: {
    type: Number
  },
  message: {
    type: String
  },
  member: {
    type: Schema.Types.ObjectId
  },
  supporter: {
    type: Schema.Types.ObjectId
  },
  reason: {
    type: String
  },
  data: {
    type: Schema.Types.Mixed
  },
  createdAt: {
    type: Number,
    default: Date.now
  }
}, {id: false, versionKey: false});


InvoiceOrderLog.statics.logOrder = function (objCreate) {
  this
    .create(objCreate, () => {})
}

module.exports = mongoConnections('master').model('InvoiceOrderLog', InvoiceOrderLog);
