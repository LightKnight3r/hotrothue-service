const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const SupportCategory = new mongoose.Schema({
  name: {
    type: String
  },
  description: {
    type: String
  },
  icon: {
    type: String
  },
  supportTypes: {
    type: Array,
    default: []
  },
  status: {
    type: String,
    default: 1
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

module.exports = mongoConnections('master').model('SupportCategory', SupportCategory);
