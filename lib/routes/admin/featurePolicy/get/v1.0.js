const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeaturePolicyModel = require('../../../../models/featurePolicy');

module.exports = (req, res) => {
  const { id, scopeValue } = req.body;

  const checkParams = (next) => {
    if (!id && !scopeValue) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng cung cấp id hoặc scopeValue của feature policy'
        }
      });
    }
    next();
  };

  const getFeaturePolicy = (next) => {
    const query = id ? { _id: id } : { scopeValue: scopeValue };
    
    FeaturePolicyModel
      .findOne(query)
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Feature policy không tồn tại"
            }
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      });
  };

  async.waterfall([checkParams, getFeaturePolicy], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
