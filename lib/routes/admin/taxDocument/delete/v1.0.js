const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const TaxDocumentModel = require('../../../../models/taxDocument');
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
    TaxDocumentModel.findById(id)
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
              body: 'Văn bản thuế không tồn tại',
            },
          });
        }
        if (result.status === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Văn bản thuế đã bị xóa',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteTaxDocument = (next) => {
    TaxDocumentModel.findOneAndUpdate(
      { _id: id, status: 1 },
      { status: 0 },
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Xóa văn bản thuế thất bại',
          },
        });
      }
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_TAX_DOCUMENT',
      description: 'Xóa văn bản thuế',
      data: {
        taxDocumentId: id,
        documentInfo: {
          documentNumber: oldData.documentNumber,
          documentName: oldData.documentName,
          issueDate: oldData.issueDate,
          documentType: oldData.documentType,
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
          body: 'Xóa văn bản thuế thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deleteTaxDocument, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
