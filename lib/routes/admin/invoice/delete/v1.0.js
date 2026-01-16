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

  const deleteInvoice = (next) => {
    InvoiceModel.deleteOne({ _id: id }, (err, result) => {
      if (err) {
        return next(err);
      }
      if (result.deletedCount === 0) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: "Thông báo",
            body: "Xóa hóa đơn thất bại"
          }
        });
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        message: {
          head: "Thông báo",
          body: "Xóa hóa đơn thành công"
        }
      });
    });
  };

  async.waterfall([checkParams, deleteInvoice], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
