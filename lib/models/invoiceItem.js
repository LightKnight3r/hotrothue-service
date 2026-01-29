const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const InvoiceItem = new mongoose.Schema({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  supporter: { type: Schema.Types.ObjectId, ref: 'User' },
  order: { type: Schema.Types.ObjectId, ref: 'InvoiceOrder', required: true },
  code: { type: String,}, // mã hóa đơn
  symbol: { type: String}, // ký hiệu hóa đơn
  orderNumber: { type: String}, // số hóa đơn
  dateOfIssue: { type: Number}, // ngày xuất hóa đơn
  sellCompany: { type: String }, // doanh nghiệp bán
  TIN: {
    type: String, required: true // mã số thuế doanh nghiệp bán
  },
  good: {
    type: String // hàng hóa dịch vụ
  },
  value: { type: Number}, // giá trị mua
  taxPercent: { type: Number }, // thuế xuất %
  taxValue: { type: Number }, // tiền thuế GTGT
  totalValue: { type: Number}, // tổng tiền
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
