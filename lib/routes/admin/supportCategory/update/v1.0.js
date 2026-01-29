const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const SupportCategoryModel = require('../../../../models/supportCategory');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id, name, description, icon, supportTypes } = req.body;
  const userId = _.get(req, 'user.id', '');
  let oldData = {};
  let updatedData = {};

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

  const checkDuplicate = (next) => {
    // Nếu có thay đổi tên, kiểm tra trùng
    if (name && name.trim() !== oldData.name) {
      SupportCategoryModel.findOne({
        name: name.trim(),
        _id: { $ne: id },
      })
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
                body: 'Tên danh mục đã tồn tại',
              },
            });
          }
          next();
        });
    } else {
      next();
    }
  };

  const updateCategory = (next) => {
    const updateData = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (supportTypes !== undefined) updateData.supportTypes = supportTypes;

    SupportCategoryModel.findOneAndUpdate(
      { _id: id },
      updateData,
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
              body: 'Không thể cập nhật danh mục',
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
      action: 'UPDATE_SUPPORT_CATEGORY',
      description: 'Cập nhật danh mục hỗ trợ',
      data: {
        categoryId: id,
        oldData: oldData,
        newData: updatedData,
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
        message: {
          head: 'Thông báo',
          body: 'Cập nhật danh mục hỗ trợ thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkExists, checkDuplicate, updateCategory, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Update support category error:', err);
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
