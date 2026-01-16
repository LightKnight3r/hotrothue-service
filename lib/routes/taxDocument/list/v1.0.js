const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocument = require('../../../models/taxDocument');

module.exports = (req, res) => {
  // Pagination params
  const limit = parseInt(req.body.limit) || 20;
  const page = parseInt(req.body.page) || 1;
  
  // Search params
  const search = req.body.search || '';
  
  // Filter params
  const documentNumber = req.body.documentNumber || '';
  const documentType = req.body.documentType || '';
  const issuingAuthority = req.body.issuingAuthority || '';
  const taxCategory = req.body.taxCategory || '';
  const applicableObject = req.body.applicableObject || '';
  const issueDateFrom = req.body.issueDateFrom || null; // timestamp (number)
  const issueDateTo = req.body.issueDateTo || null; // timestamp (number)
  
  // Sort params
  const sortField = req.body.sortField || 'issueDate'; // issueDate, documentNumber, documentName, createdAt
  const sortOrder = req.body.sortOrder || 'desc'; // asc or desc

  let totalCount = 0;

  const checkParams = (next) => {
    if (limit < 1 || limit > 100) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Limit phải từ 1 đến 100',
        },
      });
    }
    
    if (page < 1) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Page phải lớn hơn 0',
        },
      });
    }
    
    const allowedSortFields = ['issueDate', 'documentNumber', 'documentName', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sortField)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Trường sắp xếp không hợp lệ',
        },
      });
    }
    
    if (!['asc', 'desc'].includes(sortOrder)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Thứ tự sắp xếp phải là asc hoặc desc',
        },
      });
    }
    
    next();
  };

  const getTotalCount = (next) => {
    const query = buildQuery();
    
    TaxDocument.countDocuments(query).exec((err, count) => {
      if (err) {
        return next(err);
      }
      totalCount = count;
      next();
    });
  };

  const listTaxDocuments = (next) => {
    const query = buildQuery();
    
    // Build sort object
    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
    
    TaxDocument
      .find(query)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort(sort)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result,
          pagination: {
            page: page,
            limit: limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          }
        });
      });
  };

  // Helper function to build query
  function buildQuery() {
    const query = {};
    
    // Search trong documentName và documentNumber
    if (search) {
      query.$or = [
        { documentName: { $regex: search, $options: 'i' } },
        { documentNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Filter by documentNumber (exact match hoặc partial)
    if (documentNumber) {
      query.documentNumber = { $regex: documentNumber, $options: 'i' };
    }
    
    // Filter by documentType
    if (documentType) {
      query.documentType = { $regex: documentType, $options: 'i' };
    }
    
    // Filter by issuingAuthority
    if (issuingAuthority) {
      query.issuingAuthority = { $regex: issuingAuthority, $options: 'i' };
    }
    
    // Filter by taxCategory
    if (taxCategory) {
      query.taxCategory = { $regex: taxCategory, $options: 'i' };
    }
    
    // Filter by applicableObject
    if (applicableObject) {
      query.applicableObject = { $regex: applicableObject, $options: 'i' };
    }
    
    // Filter by issueDate range (timestamp number)
    if (issueDateFrom || issueDateTo) {
      query.issueDate = {};
      if (issueDateFrom) {
        query.issueDate.$gte = parseInt(issueDateFrom);
      }
      if (issueDateTo) {
        query.issueDate.$lte = parseInt(issueDateTo);
      }
    }
    
    return query;
  }

  async.waterfall([
    checkParams,
    getTotalCount,
    listTaxDocuments,
  ], (err, data) => {
    if (_.isError(err)) {
      logger.logError([err], req.originalUrl, req.body);
      MailUtil.sendMail(`${req.originalUrl} - ${err} - ${JSON.stringify(req.body)}`);
    }
    
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
