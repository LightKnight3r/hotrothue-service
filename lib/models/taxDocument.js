const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')
const CONSTANTS = require('../const')


const TaxDocument = new mongoose.Schema({
  // Số hiệu văn bản
  documentNumber: {
    type: String,
    trim: true,
    index: true
  },

  // Tên văn bản
  documentName: {
    type: String,
    trim: true,
    required: true
  },

  // Ngày ban hành (từ ngày)
  issueDate: {
    type: Date,
    required: true,
    index: true
  },

  // Ngày ban hành (đến ngày) - if applicable for date range
  issueDateTo: {
    type: Date
  },

  // Loại văn bản
  documentType: {
    type: String,
    trim: true,
    index: true
  },

  // Cơ quan ban hành
  issuingAuthority: {
    type: String,
    trim: true,
    index: true
  },

  // Sắc thuế
  taxCategory: {
    type: String,
    trim: true
  },

  // Đối tượng áp dụng
  applicableObject: {
    type: String,
    trim: true
  },

  // Đường dẫn tài liệu
  url: {
    type: String,
    trim: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {id: false, versionKey: false});

module.exports = mongoConnections('master').model('TaxDocument', TaxDocument);
