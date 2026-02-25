const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const FeatureModel = require('../../../../models/feature');

module.exports = (req, res) => {
  const { id, key } = req.body;

  const checkParams = (next) => {
    if (!id && !key) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng cung cấp id hoặc key của tính năng'
        }
      });
    }
    next();
  };

  const getFeature = (next) => {
    const query = id ? { _id: id } : { key: key };
    
    FeatureModel
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
              body: "Tính năng không tồn tại"
            }
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      });
  };

  async.waterfall([checkParams, getFeature], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
