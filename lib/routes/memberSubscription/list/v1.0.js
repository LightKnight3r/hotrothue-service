const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MemberSubscriptionModel = require('../../../models/memberSubscription');

module.exports = (req, res) => {
  const userId =  _.get(req, 'user.id', '');

  const checkParams = (next) => {
    if (!userId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }

    next();
  };

  const getSubscriptions = (next) => {
    MemberSubscriptionModel
      .find({ 
        member: userId,
        endTime: { $gte: Date.now() },
        status: 'ACTIVE'
       })
      .populate('package')
      .sort({ createdAt: -1 })
      .lean()
      .exec((err, subscriptions) => {
        if (err) {
          return next(err);
        }

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: subscriptions
        });
      });
  };

  async.waterfall([
    checkParams,
    getSubscriptions
  ], (err, data) => {
    if (_.isError(err)) {
      data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      };
    }

    res.json(data || err);
  });
};
