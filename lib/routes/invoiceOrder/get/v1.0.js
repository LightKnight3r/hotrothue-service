const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const InvoiceOrderModel = require('../../../models/invoiceOrder');
const InvoiceItemModel = require('../../../models/invoiceItem');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  
  const _id = _.get(req, 'body._id', '');
  const userId = _.get(req, 'user.id', '');

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
    if(!_id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Thiếu tham số ID đơn hàng hóa đơn',
        },
      });
    }

    next();
  }
  
  const getInvoiceOrders = (next) => {
    InvoiceOrderModel
      .findOne({
        _id: _id,
      })
      .populate({
        path: 'items',
        model: 'InvoiceItem',
        select: '-member -order -supporter',
        populate: {
          path: 'references.invoice',
          model: 'Invoice',
          match: { status: 1 },
          select: 'tin companyName closeDate warning'
        }
      })
      .select('code type sourceFile paymentStatus paymentMethod resultSummary inputTIN status pricing items updatedAt createdAt')
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if(!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy hóa đơn tra cứu',
            },
          });
        }
        if(![CONSTANTS.ORDER_STATUS.COMPLETED].includes(result.status)) {
          result.items.map(item => {
            item.references = {};
            item.decisions = [];
            return item;
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result,
        });
      });
  };

  async.waterfall([
    checkParams,
    getInvoiceOrders,
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
