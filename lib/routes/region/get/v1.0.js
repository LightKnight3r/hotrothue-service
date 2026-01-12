const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const RegionModel = require('./../../../models/region')
const { error } = require('winston');
const message = require('../../../message');

module.exports = (req, res) => {
  const { id } = req.body

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    next();
  };

  const getRegion = (next) => {
    RegionModel
      .findOne({ active: 1, _id: id})
      .exec((err, result) => {
        if (err) {
          return next(err)
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.IS_NOT_EXISTED
          })
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        })
      })
  }



  async.waterfall([checkParams, getRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
