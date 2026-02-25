const mongoose = require('mongoose');
const mongoConnections = require('../connections/mongo');

const MemberSubscriptionSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPackage', required: true },

  startTime: { type: Number, required: true, index: true }, // ms
  endTime: { type: Number, required: true, index: true },   // ms

  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELED', 'REFUNDED'], default: 'ACTIVE', index: true },

  // phục vụ đối soát thanh toán
  payment: {
    provider: { type: String, default: '' },  // vnpay, momo...
    orderCode: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    paidAt: { type: Number, default: 0 },
    meta: { type: Object, default: {} },
  },

  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now }
}, { id: false, versionKey: false });

MemberSubscriptionSchema.index({ memberId: 1, endTime: -1 });

module.exports = mongoConnections('master').model('MemberSubscription', MemberSubscriptionSchema);