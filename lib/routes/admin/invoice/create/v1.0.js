const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const { tin, companyName, closeDate, warning, status } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newInvoice;

  const checkParams = (next) => {
    if (!tin || !tin.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập mã số thuế',
        },
      });
    }
    if (!companyName || !companyName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập tên công ty',
        },
      });
    }
    next();
  };

  const createInvoice = (next) => {
    const obj = {
      tin: tin.trim(),
      companyName: companyName.trim(),
      companyNameAlias: change_alias(companyName),
    };

    if (closeDate) obj.closeDate = closeDate;
    if (warning) obj.warning = warning.trim();
    if (status !== undefined) obj.status = status;

    InvoiceModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newInvoice = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_INVOICE',
      description: 'Tạo mới hóa đơn',
      data: {
        invoiceId: newInvoice._id,
        invoiceInfo: {
          tin: newInvoice.tin,
          companyName: newInvoice.companyName,
          closeDate: newInvoice.closeDate,
          status: newInvoice.status,
        },
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: newInvoice,
      });
    });
  };

  async.waterfall([checkParams, createInvoice, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
