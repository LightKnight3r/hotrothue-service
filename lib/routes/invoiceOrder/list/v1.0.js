const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const InvoiceOrderModel = require('../../../models/invoiceOrder');
const InvoiceItemModel = require('../../../models/invoiceItem');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  // Pagination params
  const limit = parseInt(req.body.limit) || 20;
  const page = parseInt(req.body.page) || 1;
  
  // Filter params
  const TIN = req.body.TIN || '';
  const status = req.body.status !== undefined ? parseInt(req.body.status) : null;
  const code = req.body.code || '';

  const userId = _.get(req, 'user.id', '');
  let totalCount = 0;
  let memberId = null;

  const checkParams = (next) => {
    if (!userId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Không tìm thấy thông tin người dùng',
        },
      });
    }

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
    
    next();
  };

  const getMember = (next) => {
    MemberModel.findOne({ _id: userId })
      .lean()
      .exec((err, member) => {
        if (err) {
          return next(err);
        }
        
        if (!member) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy thông tin member',
            },
          });
        }
        
        memberId = member._id;
        next();
      });
  };

  const getTotalCount = (next) => {
    const query = buildQuery();
    
    InvoiceOrderModel.countDocuments(query).exec((err, count) => {
      if (err) {
        return next(err);
      }
      totalCount = count;
      next();
    });
  };

  const listInvoiceOrders = (next) => {
    const query = buildQuery();
    
    InvoiceOrderModel
      .find(query)
      .select('code type paymentStatus inputTIN paymentMethod status pricing updatedAt createdAt')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 })
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
    const query = { member: memberId };
    
    // Filter by TIN trong inputTIN array
    if (TIN) {
      query.inputTIN = TIN;
    }
    
    // Filter by status
    if (status !== null && !isNaN(status)) {
      query.status = status;
    }
    
    // Filter by code
    if (code) {
      query.code = code;
    }
    
    return query;
  }

  async.waterfall([
    checkParams,
    getMember,
    getTotalCount,
    listInvoiceOrders,
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
