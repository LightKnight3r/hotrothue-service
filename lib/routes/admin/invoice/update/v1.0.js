const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const { id, tin, companyName, closeDate, warning, status } = req.body;
  const userId = _.get(req, 'user.id', '');
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Hóa đơn không tồn tại',
        },
      });
    }
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

  const getOldData = (next) => {
    InvoiceModel.findOne({ _id: id, status: 1 })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Hóa đơn không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const updateInvoice = (next) => {
    const obj = {
      tin: tin.trim(),
      companyName: companyName.trim(),
      companyNameAlias: change_alias(companyName),
    };

    if (closeDate) obj.closeDate = closeDate;
    if (warning) obj.warning = warning.trim();
    if (status !== undefined) obj.status = status;

    InvoiceModel.findOneAndUpdate({ _id: id }, obj, { new: true }, (err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Cập nhật hóa đơn thất bại',
          },
        });
      }
      updatedData = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'UPDATE_INVOICE',
      description: 'Cập nhật hóa đơn',
      data: {
        invoiceId: id,
        oldData: oldData,
        updatedData: updatedData,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData,
      });
    });
  };

  async.waterfall([checkParams, getOldData, updateInvoice, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
