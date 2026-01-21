const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const { id } = req.body;
  const userId = _.get(req, 'user.id', '');
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    next();
  };

  const getOldData = (next) => {
    InvoiceModel.findById(id)
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
        if (result.status === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Hóa đơn đã bị xóa',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteInvoice = (next) => {
    InvoiceModel.findOneAndUpdate({ _id: id, status: 1 }, { status: 0 }, { new: true }).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Xóa hóa đơn thất bại',
          },
        });
      }
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_INVOICE',
      description: 'Xóa hóa đơn',
      data: {
        invoiceId: id,
        invoiceInfo: {
          tin: oldData.tin,
          companyName: oldData.companyName,
          closeDate: oldData.closeDate,
          status: oldData.status,
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
        message: {
          head: 'Thông báo',
          body: 'Xóa hóa đơn thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deleteInvoice, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
