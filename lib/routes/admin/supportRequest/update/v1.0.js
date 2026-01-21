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
  const status = req.body.status;
  const userId = _.get(req, 'user.id', '');
  let oldData = {};
  let updatedData = {};

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

    if (status === undefined || status === null) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Trạng thái không được để trống',
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

  const updateRequest = (next) => {
    SupportRequest.findOneAndUpdate(
      { _id: id },
      {
        status: parseInt(status),
        updatedAt: Date.now(),
      },
      { new: true }
    )
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
              body: 'Không thể cập nhật yêu cầu hỗ trợ',
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
      action: 'UPDATE_SUPPORT_REQUEST',
      description: 'Cập nhật trạng thái yêu cầu hỗ trợ',
      data: {
        supportRequestId: id,
        oldStatus: oldData.status,
        newStatus: updatedData.status,
      },
      updatedData: updatedData,
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData,
        message: {
          head: 'Thông báo',
          body: 'Cập nhật yêu cầu hỗ trợ thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkExists, updateRequest, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Update support request error:', err);
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
