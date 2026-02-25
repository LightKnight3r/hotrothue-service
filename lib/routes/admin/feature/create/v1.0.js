const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeatureModel = require('../../../../models/feature');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const {
    key,
    displayName,
    description,
    order,
    status
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newFeature;

  const checkParams = (next) => {
    if (!key || !key.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập key của tính năng',
        },
      });
    }
    if (!displayName || !displayName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập tên hiển thị của tính năng',
        },
      });
    }
    next();
  };

  const checkDuplicate = (next) => {
    FeatureModel.findOne({ key: key.trim().toUpperCase() })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Key tính năng đã tồn tại',
            },
          });
        }
        next();
      });
  };

  const createFeature = (next) => {
    const obj = {
      key: key.trim().toUpperCase(),
      displayName: displayName.trim(),
      description: description || '',
      order: order || 0,
      status: status !== undefined ? status : 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    FeatureModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newFeature = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_FEATURE',
      description: 'Tạo mới tính năng',
      data: {
        featureId: newFeature._id,
        featureInfo: {
          key: newFeature.key,
          displayName: newFeature.displayName,
          order: newFeature.order,
          status: newFeature.status
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
        data: newFeature,
        message: {
          head: 'Thông báo',
          body: 'Tạo tính năng thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkDuplicate, createFeature, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};