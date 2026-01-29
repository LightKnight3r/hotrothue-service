const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const SupportCategoryModel = require('../../../../models/supportCategory');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id } = req.body || '';
  const userId = _.get(req, 'user.id', '');

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    next();
  };

  const getCategory = (next) => {
    SupportCategoryModel.findOne({
      _id: id,
    })
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
              body: 'Danh mục không tồn tại',
            },
          });
        }

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result,
        });
      });
  };

  const writeLog = (data, next) => {
    const logData = {
      user: userId,
      action: 'GET_SUPPORT_CATEGORY',
      description: 'Xem thông tin danh mục hỗ trợ',
      data: {
        categoryId: id,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, data);
    });
  };

  async.waterfall([checkParams, getCategory, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
