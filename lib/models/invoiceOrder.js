const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const InvoiceOrder = new mongoose.Schema({
  code: { type: String, required: true },
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  supporter: { type: Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['basic', 'detailed'], // có file upload thì là detailed ngược lại là basic
  },
  sourceFile: { 
    type: String
  },
  inputTIN: {
    type: Array,
    default: []
  },
  pricing: {
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  },
  paymentStatus: {
    type: Number,
    default: CONSTANTS.PAYMENT_STATUS.UNPAID
  },
  resultSummary: {
    type: Schema.Types.Mixed
  },
  items: [{
    type: Schema.Types.ObjectId,
    ref: 'InvoiceItem'
  }],
  status: {
    type: Number,
    default: CONSTANTS.ORDER_STATUS.WAITING_PAYMENT
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

module.exports = mongoConnections('master').model('InvoiceOrder', InvoiceOrder);
