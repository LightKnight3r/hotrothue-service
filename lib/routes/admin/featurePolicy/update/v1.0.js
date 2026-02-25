const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeaturePolicyModel = require('../../../../models/featurePolicy');
const FeatureModel = require('../../../../models/feature');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const {
    id,
    scopeValue,
    features
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
          body: "Feature policy không tồn tại"
        }
      });
    }
    if (scopeValue && !['FREE', 'MEMBER'].includes(scopeValue)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "scopeValue phải là FREE hoặc MEMBER"
        }
      });
    }
    if (features && (!Array.isArray(features) || features.length === 0)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Danh sách features không hợp lệ"
        }
      });
    }
    next();
  };

  const getOldData = (next) => {
    FeaturePolicyModel.findOne({ _id: id })
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
              body: "Feature policy không tồn tại"
            }
          });
        }
        oldData = result;
        next();
      });
  };

  const checkDuplicateScopeValue = (next) => {
    // Nếu có thay đổi scopeValue, kiểm tra scopeValue mới có bị trùng không
    if (scopeValue && scopeValue !== oldData.scopeValue) {
      FeaturePolicyModel.findOne({ scopeValue: scopeValue })
        .exec((err, result) => {
          if (err) {
            return next(err);
          }
          if (result) {
            return next({
              code: CONSTANTS.CODE.FAIL,
              message: {
                head: "Thông báo",
                body: `Feature policy cho ${scopeValue} đã tồn tại`
              }
            });
          }
          next();
        });
    } else {
      next();
    }
  };

  const checkFeatureKeys = (next) => {
    // Chỉ validate nếu có update features
    if (!features) {
      return next();
    }

    // Lấy tất cả các key từ features array
    const featureKeys = features.map(f => f.key).filter(Boolean);
    
    if (featureKeys.length === 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Không có feature key nào được cung cấp',
        },
      });
    }

    // Kiểm tra tất cả các key có tồn tại trong Feature model không
    FeatureModel.find({
      key: { $in: featureKeys },
      status: 1
    })
    .select('key')
    .exec((err, existingFeatures) => {
      if (err) {
        return next(err);
      }

      const existingKeys = existingFeatures.map(f => f.key);
      const invalidKeys = featureKeys.filter(key => !existingKeys.includes(key));

      if (invalidKeys.length > 0) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: `Các feature key không tồn tại: ${invalidKeys.join(', ')}`,
          },
        });
      }

      next();
    });
  };

  const updateFeaturePolicy = (next) => {
    const obj = {
      updatedAt: Date.now()
    };

    if (scopeValue) obj.scopeValue = scopeValue;
    if (features) obj.features = features;

    FeaturePolicyModel.findOneAndUpdate(
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
            body: "Cập nhật feature policy thất bại"
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
      action: 'UPDATE_FEATURE_POLICY',
      description: 'Cập nhật feature policy',
      data: {
        featurePolicyId: id,
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
          body: "Cập nhật feature policy thành công"
        }
      });
    });
  };

  async.waterfall([checkParams, getOldData, checkDuplicateScopeValue, checkFeatureKeys, updateFeaturePolicy, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
