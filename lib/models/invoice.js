const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const Invoice = new mongoose.Schema({
  tin: { type: String, required: true },
  companyName: { type: String, required: true },
  closeDate: { type: String},
  warning: { type: String},
  status: {
    type: Number,
    default: 1
  }
}, {id: false, versionKey: false});

module.exports = mongoConnections('master').model('Invoice', Invoice);
