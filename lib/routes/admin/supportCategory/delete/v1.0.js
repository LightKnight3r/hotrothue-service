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
  let oldData = {};
  let deletedData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'ID danh mục không được để trống',
        },
      });
    }
    next();
  };

  const checkExists = (next) => {
    SupportCategoryModel.findById(id)
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
        oldData = result;
        next();
      });
  };

  const deleteCategory = (next) => {
    SupportCategoryModel.findOneAndUpdate(
      { _id: id },
      {
        status: 0,
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
              body: 'Không thể xóa danh mục',
            },
          });
        }
        deletedData = result;
        next();
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_SUPPORT_CATEGORY',
      description: 'Xóa danh mục hỗ trợ',
      data: {
        categoryId: id,
        categoryInfo: {
          name: oldData.name,
          description: oldData.description,
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
        data: deletedData,
        message: {
          head: 'Thông báo',
          body: 'Xóa danh mục hỗ trợ thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkExists, deleteCategory, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Delete support category error:', err);
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
