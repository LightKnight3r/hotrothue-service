const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeatureModel = require('../../../../models/feature');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const {
    id,
    key,
    displayName,
    description,
    order,
    status
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Tính năng không tồn tại"
        }
      });
    }
    if (key && !key.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Key tính năng không hợp lệ"
        }
      });
    }
    if (displayName && !displayName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Tên hiển thị không hợp lệ"
        }
      });
    }
    next();
  };

  const getOldData = (next) => {
    FeatureModel.findOne({ _id: id })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Tính năng không tồn tại"
            }
          });
        }
        oldData = result;
        next();
      });
  };

  const checkDuplicateKey = (next) => {
    // Nếu có thay đổi key, kiểm tra key mới có bị trùng không
    if (key && key.trim().toUpperCase() !== oldData.key) {
      FeatureModel.findOne({ key: key.trim().toUpperCase() })
        .exec((err, result) => {
          if (err) {
            return next(err);
          }
          if (result) {
            return next({
              code: CONSTANTS.CODE.FAIL,
              message: {
                head: "Thông báo",
                body: "Key tính năng đã tồn tại"
              }
            });
          }
          next();
        });
    } else {
      next();
    }
  };

  const updateFeature = (next) => {
    const obj = {
      updatedAt: Date.now()
    };

    if (key) obj.key = key.trim().toUpperCase();
    if (displayName) obj.displayName = displayName.trim();
    if (description !== undefined) obj.description = description || '';
    if (order !== undefined) obj.order = order;
    if (status !== undefined) obj.status = status;

    FeatureModel.findOneAndUpdate(
      { _id: id },
      obj,
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: "Thông báo",
            body: "Cập nhật tính năng thất bại"
          }
        });
      }
      updatedData = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'UPDATE_FEATURE',
      description: 'Cập nhật tính năng',
      data: {
        featureId: id,
        oldData: oldData,
        updatedData: updatedData
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
          head: "Thông báo",
          body: "Cập nhật tính năng thành công"
        }
      });
    });
  };

  async.waterfall([checkParams, getOldData, checkDuplicateKey, updateFeature, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
