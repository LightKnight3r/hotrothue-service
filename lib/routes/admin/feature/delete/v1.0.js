const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeatureModel = require('../../../../models/feature');
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
    FeatureModel.findById(id)
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
              body: 'Tính năng không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteFeature = (next) => {
    FeatureModel.findByIdAndUpdate(
      id,
      { status: 0, updatedAt: Date.now() },
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Xóa tính năng thất bại',
          },
        });
      }
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_FEATURE',
      description: 'Xóa tính năng',
      data: {
        featureId: id,
        featureInfo: oldData,
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
          body: 'Xóa tính năng thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deleteFeature, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
