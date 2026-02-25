const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeatureModel = require('../../../../models/feature');

module.exports = (req, res) => {
  const search = req.body.textSearch;
  const status = req.body.status;
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 100;

  const checkParams = (next) => {
    next();
  };

  const listFeature = (next) => {
    const query = {};

    // Search by displayName or key
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'gi' } },
        { key: { $regex: search, $options: 'gi' } },
      ];
    }

    // Filter by status
    if (status !== undefined) {
      query.status = status;
    } else {
      query.status = 1;
    }

    const skip = (page - 1) * limit;

    async.parallel({
      data: (cb) => {
        FeatureModel.find(query)
          .sort({ order: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(cb);
      },
      total: (cb) => {
        FeatureModel.countDocuments(query).exec(cb);
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

  async.waterfall([checkParams, listFeature], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
