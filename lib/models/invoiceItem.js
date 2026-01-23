const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const InvoiceItem = new mongoose.Schema({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  supporter: { type: Schema.Types.ObjectId, ref: 'User' },
  order: { type: Schema.Types.ObjectId, ref: 'InvoiceOrder', required: true },

  code: { type: String, required: true }, // mã hóa đơn
  symbol: { type: String, required: true }, // ký hiệu hóa đơn
  orderNumber: { type: String, required: true }, // số hóa đơn
  dateOfIssue: { type: Number, required: true }, // ngày xuất hóa đơn
  sellCompany: { type: String, required: true }, // doanh nghiệp bán
  TIN: {
    type: String, required: true // mã số thuế doanh nghiệp bán
  },
  good: {
    type: String, required: true // hàng hóa dịch vụ
  },
  value: { type: Number, required: true }, // giá trị mua
  taxPercent: { type: Number, required: true }, // thuế xuất %
  taxValue: { type: Number, required: true }, // tiền thuế GTGT
  totalValue: { type: Number, required: true }, // tổng tiền
  note: { type: String }, // ghi chú
  status: {
    type: Number,
    default: CONSTANTS.ITEM_STATUS.PROCESSING
  },
  decisions: {
    type: Array,
    default: []
  },
  references: {
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    file: {
      type: String
    },
    note: {
      type: String
    }
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

module.exports = mongoConnections('master').model('InvoiceItem', InvoiceItem);
