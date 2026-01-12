const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const { error } = require('winston');
const RegionModel = require('./../../../models/region')
const message = require('../../../message');
const {change_alias, isValidURL} = require('../../../utils/tool');
const { default: isURL } = require('validator/lib/isURL');

module.exports = (req, res) => {
  const {name, key, location, order} = req.body
  const checkParams = (next) => {
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
    if (!location.lat || !location.lng || location.lat > 90 || location.lng > 180) {
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
      .countDocuments({name: name.trim(), active: 1})
      .exec((err, result) => {
        if (err) {
          return next(err)
        } 
        if (result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.IS_EXISTED
          })
        }
        next()
      })
  }

  const createRegion = (next) => {
    const obj = {
      name: name.trim(),
      key: key,
      active: 1,
      location,
      order: order || 0,
      nameAlias: change_alias(name)
    }
    RegionModel
      .create(obj, (err, result) => {
        if (err) {
          return next(err)
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        })
      })

  }
  

  async.waterfall([checkParams, checkRegionName, createRegion ], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
