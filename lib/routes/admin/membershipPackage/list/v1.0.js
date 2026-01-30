const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const MembershipPackageModel = require('../../../../models/membershipPackage');

module.exports = (req, res) => {
  const search = req.body.textSearch;
  const status = req.body.status;

  const checkParams = (next) => {
    next();
  };

  const listMembershipPackage = (next) => {
    const query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'gi' };
    }

    // Filter by status
    if (status !== undefined) {
      query.status = status;
    } else {
      query.status = 1;
    }

    MembershipPackageModel.find(query)
      .sort({ createdAt: -1 })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result,
          total: result.length,
        });
      });
  };

  async.waterfall([checkParams, listMembershipPackage], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
