const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const PolicyDocumentModel = require('../../../../models/policyDocument');
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
    PolicyDocumentModel.findById(id)
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
              body: 'Văn bản chính sách không tồn tại',
            },
          });
        }
        if (result.status === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Văn bản chính sách đã bị xóa',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deletePolicyDocument = (next) => {
    PolicyDocumentModel.findOneAndUpdate(
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
            body: 'Xóa văn bản chính sách thất bại',
          },
        });
      }
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_POLICY_DOCUMENT',
      description: 'Xóa văn bản chính sách',
      data: {
        policyDocumentId: id,
        documentInfo: {
          documentNumber: oldData.documentNumber,
          documentName: oldData.documentName,
          issueDate: oldData.issueDate,
          documentType: oldData.documentType,
          price: oldData.price
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
          body: 'Xóa văn bản chính sách thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deletePolicyDocument, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
