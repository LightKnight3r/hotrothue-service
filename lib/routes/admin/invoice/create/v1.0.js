const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const {
    tin,
    companyName,
    closeDate,
    warning,
    status
  } = req.body;

  const checkParams = (next) => {
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

  const createInvoice = (next) => {
    const obj = {
      tin: tin.trim(),
      companyName: companyName.trim(),
      companyNameAlias: change_alias(companyName)
    };

    if (closeDate) obj.closeDate = closeDate;
    if (warning) obj.warning = warning.trim();
    if (status !== undefined) obj.status = status;

    InvoiceModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: result
      });
    });
  };

  async.waterfall([checkParams, createInvoice], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
