const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const SupportRequest = require('../../../../models/supportRequest');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id } = req.body || '';
  const userId = _.get(req, 'user.id', '');
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'ID yêu cầu hỗ trợ không được để trống',
        },
      });
    }
    next();
  };

  const checkExists = (next) => {
    SupportRequest.findById(id)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Yêu cầu hỗ trợ không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteRequest = (next) => {
    SupportRequest.findOneAndDelete({ _id: id })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Không thể xóa yêu cầu hỗ trợ',
            },
          });
        }
        next();
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_SUPPORT_REQUEST',
      description: 'Xóa yêu cầu hỗ trợ',
      data: {
        supportRequestId: id,
        supportRequestInfo: {
          category: oldData.category,
          content: oldData.content,
          member: oldData.member,
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
        data: {
          _id: oldData._id,
        },
        message: {
          head: 'Thông báo',
          body: 'Xóa yêu cầu hỗ trợ thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkExists, deleteRequest, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Delete support request error:', err);
    }

    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR || {
          head: 'Thông báo',
          body: 'Lỗi hệ thống',
        },
      });

    res.json(data || err);
  });
};
