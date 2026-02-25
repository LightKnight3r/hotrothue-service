const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeaturePolicyModel = require('../../../../models/featurePolicy');
const FeatureModel = require('../../../../models/feature');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const {
    scopeValue,
    features
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newFeaturePolicy;

  const checkParams = (next) => {
    if (!scopeValue) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập scopeValue (FREE hoặc MEMBER)',
        },
      });
    }
    if (!['FREE', 'MEMBER'].includes(scopeValue)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'scopeValue phải là FREE hoặc MEMBER',
        },
      });
    }
    if (!features || !Array.isArray(features) || features.length === 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Danh sách features không hợp lệ',
        },
      });
    }
    next();
  };

  const checkDuplicate = (next) => {
    FeaturePolicyModel.findOne({ scopeValue: scopeValue })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: `Feature Policy cho ${scopeValue} đã tồn tại`,
            },
          });
        }
        next();
      });
  };

  const checkFeatureKeys = (next) => {
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

  const createFeaturePolicy = (next) => {
    const obj = {
      scopeValue: scopeValue,
      features: features,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    FeaturePolicyModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newFeaturePolicy = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_FEATURE_POLICY',
      description: 'Tạo mới feature policy',
      data: {
        featurePolicyId: newFeaturePolicy._id,
        policyInfo: {
          scopeValue: newFeaturePolicy.scopeValue,
          featuresCount: newFeaturePolicy.features.length
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
        data: newFeaturePolicy,
        message: {
          head: 'Thông báo',
          body: 'Tạo feature policy thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkDuplicate, checkFeatureKeys, createFeaturePolicy, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};