const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const RegionModel = require('./../../../models/region')
const { error } = require('winston');
const message = require('../../../message');

module.exports = (req, res) => {
  const { regions } = req.body

  const checkParams = (next) => {
    if(!regions || !Array.isArray(regions)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'regions phải là mảng'
        }
      })
    }
    next()
  }
  const arrangeRegion = (next) => {
    const bulkOps = regions.map(item => ({
      updateOne: {
        filter: {_id: item.id},
        update: {order: item.order, updatedAt: Date.now()}
      }
    }))
    RegionModel.bulkWrite(bulkOps)
      .then((result) => {
        return next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          message: MESSAGES.REGION.ARRANGE_SUCCESS
        })
      })
      .catch((err) => {
        next(err)
      })
  }


  async.waterfall([checkParams, arrangeRegion], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
