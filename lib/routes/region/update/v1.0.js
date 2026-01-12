const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const RegionModel = require('./../../../models/region')
const { error } = require('winston');
const message = require('../../../message');
const { change_alias, isValidURL } = require('../../../utils/tool');

module.exports = (req, res) => {
  const { id, name, key, location, order } = req.body
  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Khu vực không tồn tại"
        }
      });
    }
    if ((name && !name.trim()) || !name) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập tên khu vực"
        }
      });
    }
    if (!key) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập mã khu vực"
        }
      })
    }
    if (!location) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập vị trí khu vực"
        }
      })
    }
    if (!location.lat || !location.lng || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Vị trí khu vực không hợp lệ"
        }
      })
    }
    next();
  };

  const checkRegionName = (next) => {
    RegionModel
      .countDocuments({ active: 1, name: name.trim(), _id: {$ne: id}})
      .exec((err, result) => {
        if (result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.IS_EXISTED
          })
        }
        next()
      })
  }

  const updateRegion = (next) => {
    const obj = {
      name: name.trim(),
      updatedAt: Date.now(),
      key,
      location,
      order: order || 0,
      nameAlias: change_alias(name)
    }
    RegionModel
      .findOneAndUpdate({_id: id, active: 1}, obj, {fields: "name key location", new: true}, (err, result) => {
        if (err) {
          return next(err)
        }
        if (!result) {
          return next(null, {
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.UPDATE_FAIL
          })
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        })
      })

  }


  async.waterfall([checkParams, checkRegionName, updateRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
