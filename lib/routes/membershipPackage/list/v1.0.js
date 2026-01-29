const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MembershipPackage = require('../../../models/membershipPackage');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  const userId = _.get(req, 'user.id', '');

  const checkParams = (next) => {
    if (!userId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Không tìm thấy thông tin người dùng',
        },
      });
    }

    
    next();
  };


  const listPackage = (next) => {
    
    MembershipPackage
      .find({
        status: 1
      })
      .sort({ price: 1 })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      });
  };

 

  async.waterfall([
    checkParams,
    listPackage,
  ], (err, data) => {
    if (_.isError(err)) {
      logger.logError([err], req.originalUrl, req.body);
      MailUtil.sendMail(`${req.originalUrl} - ${err} - ${JSON.stringify(req.body)}`);
    }
    
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
