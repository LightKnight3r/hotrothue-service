const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeaturePolicyModel = require('../../../../models/featurePolicy');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const { id } = req.body;
  const userId = _.get(req, 'user.id', '');
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    next();
  };

  const getOldData = (next) => {
    FeaturePolicyModel.findById(id)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Feature policy không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteFeaturePolicy = (next) => {
    FeaturePolicyModel.findByIdAndDelete(id)
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Xóa feature policy thất bại',
            },
          });
        }
        next();
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_FEATURE_POLICY',
      description: 'Xóa feature policy',
      data: {
        featurePolicyId: id,
        policyInfo: oldData,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        message: {
          head: 'Thông báo',
          body: 'Xóa feature policy thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deleteFeaturePolicy, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
 