const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const SupportRequestModel = require('../../../models/supportRequest');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  const userId = _.get(req, 'user.id', '');
  const supportRequestId = _.get(req, 'body.id', '');

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

    if (!supportRequestId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Thiếu ID yêu cầu hỗ trợ',
        },
      });
    }

    next();
  };

  const getMemberInfo = (next) => {
    MemberModel
      .findOne({ _id: userId })
      .lean()
      .exec((err, member) => {
        if (err) {
          return next(err);
        }
        
        if (!member) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy thông tin thành viên',
            },
          });
        }

        next(null, member);
      });
  };

  const getSupportRequest = (member, next) => {
    SupportRequestModel
      .findOne({
        _id: supportRequestId,
        member: member._id
      })
      .populate('category', 'name')
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy yêu cầu hỗ trợ',
            },
          });
        }
        
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      });
  };

  async.waterfall([
    checkParams,
    getMemberInfo,
    getSupportRequest,
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
