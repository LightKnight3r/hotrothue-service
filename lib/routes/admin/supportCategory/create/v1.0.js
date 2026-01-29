const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const SupportCategoryModel = require('../../../../models/supportCategory');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { name, description, icon, supportTypes } = req.body;
  const userId = _.get(req, 'user.id', '');
  let createdCategory = {};

  const checkParams = (next) => {
    if (!name || name.trim() === '') {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Tên danh mục không được để trống',
        },
      });
    }

    next();
  };

  const checkDuplicate = (next) => {
    SupportCategoryModel.findOne({ name: name.trim() })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Danh mục đã tồn tại',
            },
          });
        }
        next();
      });
  };

  const createCategory = (next) => {
    const categoryData = {
      name: name.trim(),
      description: description || '',
      icon: icon || '',
      supportTypes: supportTypes || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    SupportCategoryModel.create(categoryData, (err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: {
            head: 'Thông báo',
            body: 'Không thể tạo danh mục',
          },
        });
      }
      createdCategory = result.toObject();
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_SUPPORT_CATEGORY',
      description: 'Tạo danh mục hỗ trợ',
      data: {
        categoryId: createdCategory._id,
        name: createdCategory.name,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: createdCategory,
        message: {
          head: 'Thông báo',
          body: 'Tạo danh mục hỗ trợ thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkDuplicate, createCategory, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Create support category error:', err);
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
