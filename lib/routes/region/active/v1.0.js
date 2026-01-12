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

  const activeRegion = (next) => {
    RegionModel
      .updateOne({ _id: id, active: 0 }, {active: 1}, {}, (err, result) => {
        if (err) {
          return next(err)
        }
        if (result.n === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.ACTIVE_FAIL
          })
        }
        if (result.nModified) {
          return next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            message: MESSAGES.REGION.ACTIVE_SUCCESS
          })
        }
      })

  }


  async.waterfall([checkParams, activeRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
