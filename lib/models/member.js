const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConnections = require('../connections/mongo')

const MemberSchema = new mongoose.Schema({
    phone : {type: String},
    name: {type: String, default: ''},
    email: {type: String, default: ''},
    address: {type: String, default: ''},
    appName: {type: String},
    dob: {
      type: String,
    },
    companyInfo: {
      companyName: {type: String, default: ''},
      companyAddress: {type: String, default: ''},
      companyPhone: {type: String, default: ''},
      taxCode: {type: String, default: ''},
    },
    avatar: {type: String, default: ''},
    status: {type: Number, default: 0},
    money: {
      type: 'Number',
      default: 0
    },
    expiredTime: {type: Number, default: 0},
    blockUtil: {
      type: 'Number',
      default: 0
    },
    code: {type: String},
    createdAt: { type: Number, default: Date.now },
    updatedAt: {type: Number, default: Date.now }
}, {id: false, versionKey: 'v'})

MemberSchema.statics.increaseTotalOrder = function (userId, cb) {
 this.update(
  { _id: userId },
  {
   $inc: {
    "customer.totalOrders": 1,
   },
  },
 ).exec(cb)
}

MemberSchema.pre('save', function(next){
  let model = this
  attempToGenerate(model, next)
})

MemberSchema.statics.increaseMoney = function (userId, money, cb) {
 this.findOneAndUpdate(
  { _id: userId },
  {
   $inc: {
    money: money,
   },
  },
  {
   new: true,
  },
 ).exec(cb)
}

MemberSchema.statics.decreaseMoney = function (userId, money, cb) {
 this.findOneAndUpdate(
  { _id: userId },
  {
   $inc: {
    money: -money,
   },
  },
  {
   new: true,
  },
 ).exec(cb)
}

const attempToGenerate = (model, callback) => {
  let newCode =  generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)
  model.constructor.findOne({
    'code': newCode
  }).then((course) => {
    if(course){
      attempToGenerate(model, callback)
    } else {
      model.code = newCode
      callback();
    }
  }, (err) => {
    callback(err)
  })
}

module.exports = mongoConnections('master').model('Member', MemberSchema);
