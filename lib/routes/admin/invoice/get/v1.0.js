const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');

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

  const getInvoice = (next) => {
    InvoiceModel
      .findOne({ _id: id })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Hóa đơn không tồn tại"
            }
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      });
  };

  async.waterfall([checkParams, getInvoice], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
