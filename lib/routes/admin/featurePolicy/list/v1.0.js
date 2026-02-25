const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeaturePolicyModel = require('../../../../models/featurePolicy');

module.exports = (req, res) => {
  const scopeValue = req.body.scopeValue;
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 100;

  const checkParams = (next) => {
    next();
  };

  const listFeaturePolicy = (next) => {
    const query = {};

    // Filter by scopeValue
    if (scopeValue) {
      query.scopeValue = scopeValue;
    }

    const skip = (page - 1) * limit;

    async.parallel({
      data: (cb) => {
        FeaturePolicyModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(cb);
      },
      total: (cb) => {
        FeaturePolicyModel.countDocuments(query).exec(cb);
      }
    }, (err, result) => {
      if (err) {
        return next(err);
      }

      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: result.data,
        total: result.total,
        page,
        limit,
      });
    });
  };

  async.waterfall([checkParams, listFeaturePolicy], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
