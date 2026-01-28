const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceOrderModel = require('../../../../models/invoiceOrder');

module.exports = (req, res) => {
  const { id } = req.body;

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    next();
  };

  const getInvoiceOrder = (next) => {
    InvoiceOrderModel
      .findById(id)
      .populate('member', 'name email phone')
      .populate('supporter', 'name email')
      .populate('items')
      .lean()
      .exec((err, invoiceOrder) => {
        if (err) {
          return next(err);
        }

        if (!invoiceOrder) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Đơn hàng không tồn tại',
            }
          });
        }

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: invoiceOrder
        });
      });
  };

  async.waterfall([checkParams, getInvoiceOrder], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
