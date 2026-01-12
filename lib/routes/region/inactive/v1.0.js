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

  const inactiveRegion = (next) => {
    RegionModel
      .updateOne({ _id: id, active: 1 }, {active: 0}, {}, (err, result) => {
        if (err) {
          return next(err)
        }
        if (result.n === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.REGION.INACTIVE_FAIL
          })
        }
        if (result.nModified) {
          return next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            message: MESSAGES.REGION.INACTIVE_SUCCESS
          })
        }
      })

  }


  async.waterfall([checkParams, inactiveRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
