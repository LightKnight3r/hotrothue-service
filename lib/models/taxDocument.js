const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const TaxDocument = new mongoose.Schema({
  // Số hiệu văn bản
  documentNumber: {
    type: String,
    trim: true
  },

  // Tên văn bản
  documentName: {
    type: String,
    trim: true
  },

  nameAlias: {
    type: String,
    trim: true,
  },
  // Ngày ban hành (từ ngày)
  issueDate: {
    type: Number
  },

  // Loại văn bản
  documentType: {
    type: String,
    trim: true
  },

  // Cơ quan ban hành
  issuingAuthority: {
    type: String,
    trim: true
  },

  // Sắc thuế
  taxCategory: {
    type: String
  },

  // Đối tượng áp dụng
  applicableObject: {
    type: String
  },

  // Đường dẫn tài liệu
  url: {
    type: String,
    trim: true
  },

  // Trạng thái
  status: {
    type: Number,
    default: 1
  },

  // Metadata
  createdAt: {
    type: Number,
    default: Date.now
  },

  updatedAt: {
    type: Number,
    default: Date.now
  }
}, {id: false, versionKey: false});

module.exports = mongoConnections('master').model('TaxDocument', TaxDocument);
