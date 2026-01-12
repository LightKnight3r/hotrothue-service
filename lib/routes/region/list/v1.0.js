const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const RegionModel = require('./../../../models/region')
const { change_alias } = require('../../../utils/tool');

module.exports = (req, res) => {
  // const userId = _.get(req, 'user.id');
  const limit = req.body.limit || 100
  const page = req.body.page || 1 
  const status = req.body.status || [1]
  const search = req.body.search

  const checkParams = (next) => {
    if (!Array.isArray(status)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "status phải là mảng"
        }
      });
    }
    next();
  };

  const listRegion = (next) => {
    const query = {
      active: {$in: status},
    }
    if (search) {
      query.nameAlias = {$regex: change_alias(search)}
    }
    RegionModel
      .find(query, {createdAt: 0, updatedAt: 0, v: 0, region: 0})
      .limit(limit)
      .skip((page - 1)*limit)
      .sort({ "order": 1, "name": 1})
      .exec((err, result) => {
        if (err) {
          return next(err)
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        })
      })
  }

  async.waterfall([checkParams, listRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
