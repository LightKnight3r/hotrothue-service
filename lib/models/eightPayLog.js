const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')
const generate = require('nanoid/generate')

const EightPayLog = new mongoose.Schema({
  member: {
    type: Schema.Types.ObjectId,
    ref: 'Member'
  },
  region: {
    type: String,
    default: ''
  },
  status: {
    type: Number,
    default: CONSTANTS.EIGHT_PAY_STATUS.PENDING
  },
  statusApprove: {
    type: Number
  },
  increaseMoneyLog: {
    type: Schema.Types.Mixed
  },
  amount: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  transactionId: {
    type: String,
    unique: true,
  },
  receiverInfo: {
    type: Schema.Types.Mixed
  },
  qrCode: {
    type: String
  },
  tokenCode: {
    type: String
  },
  mode: {
    type: String
  },
  refundResult: {
    type: Schema.Types.Mixed
  },
  refund: {
    type: Number
  },
  responseData: {
    type: Schema.Types.Mixed
  },
  requestPayment: {
    type: Schema.Types.Mixed
  },
  invoiceOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'InvoiceOrder'
  },
  createdAt: {
    type: Number,
    default: Date.now
  },
  updatedAt: {
    type: Number,
    default: Date.now
  },
  expiresAt: {
    type: Number,
    default: 0
  },
  successAt: {
    type: Number
  }
}, {id: false, versionKey: false});

EightPayLog.pre('save', function(next){
  let model = this
  attempToGenerate(model, next)
})

const attempToGenerate = (model, callback) => {
  const ramdomCode =  generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)
  const newTransactionId = ramdomCode
  model.constructor.findOne({
    'transactionId': newTransactionId
  }).then((course) => {
    if(course){
      attempToGenerate(model, callback)
    } else {
      model.transactionId = newTransactionId
      callback();
    }
  }, (err) => {
    callback(err)
  })
}

module.exports = mongoConnections('master').model('EightPayLog', EightPayLog);
