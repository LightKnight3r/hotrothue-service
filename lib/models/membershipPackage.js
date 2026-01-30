const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConnections = require('../connections/mongo')

const MembershipPackage = new mongoose.Schema({
  name : {type: String, required: true},
  description: {type: String, default: ''},
  originalPrice: {type: Number, required: true},
  price: {type: Number, required: true},
  durationInDays: {type: Number, required: true},
  status: {type: Number, default: 1}, // 0: inactive, 1: active
  createdAt: { type: Number, default: Date.now },
  updatedAt: {type: Number, default: Date.now }
}, {id: false, versionKey: false})


module.exports = mongoConnections('master').model('MembershipPackage', MembershipPackage);
