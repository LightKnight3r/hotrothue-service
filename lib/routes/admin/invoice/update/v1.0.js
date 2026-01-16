const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const {
    id,
    tin,
    companyName,
    closeDate,
    warning,
    status
  } = req.body;

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Hóa đơn không tồn tại"
        }
      });
    }
    if (!tin || !tin.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập mã số thuế"
        }
      });
    }
    if (!companyName || !companyName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập tên công ty"
        }
      });
    }
    next();
  };

  const updateInvoice = (next) => {
    const obj = {
      tin: tin.trim(),
      companyName: companyName.trim(),
      companyNameAlias: change_alias(companyName)
    };

    if (closeDate) obj.closeDate = closeDate;
    if (warning) obj.warning = warning.trim();
    if (status !== undefined) obj.status = status;

    InvoiceModel.findOneAndUpdate(
      { _id: id },
      obj,
      { new: true },
      (err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Cập nhật hóa đơn thất bại"
            }
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      }
    );
  };

  async.waterfall([checkParams, updateInvoice], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
