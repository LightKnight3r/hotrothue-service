const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')

const CodePhones = new mongoose.Schema({
  status : {
    type: Number
  },
  phone : {
    type: String
  },
  code : {
    type: String
  },
  token : {
    type: String
  },
  provider : {
    type: String
  },
  messageId : {
    type: String
  },
  responseSPEED : {
    type: Schema.Types.Mixed
  },
  createdAt: {
    type: Number,
    default: Date.now
  },
  region: {
    type: String
  },
}, {id: false, versionKey: false});

module.exports = mongoConnections('master').model('CodePhones', CodePhones);
