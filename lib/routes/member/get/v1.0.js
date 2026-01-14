const _ = require('lodash');
const async = require('async');

const Member = require('../../../models/member');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const SystemLog = require('../../../models/systemLog');

module.exports = (req, res) => {
  const userId = req.user.id || '';
  const platform = _.get(req, 'body.platform', 'web');
  let userInf;

  const checkParams = (next) => {
    if (!userId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    next();
  };

  const getMember = (next) => {
    Member.findById(userId)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: MESSAGES.SYSTEM.ERROR,
          });
        }
        if(result.status == 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ TDV để được hỗ trợ.',
            },
          });
        }
        userInf = result;
        next();
      });
  };

  const trackMemberAccess = (next) => {
    next(null, {
      code: CONSTANTS.CODE.SUCCESS,
      data: userInf,
    });

    SystemLog.create(
      {
        user: userId,
        action: 'user_app_access',
        description: `Member accessed app`,
        data: {
          platform: platform,
          userAgent: req.headers['user-agent'] || '',
          ip: req.headers.ip || req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '',
          device: req.headers.device ? JSON.parse(req.headers.device) : {},
        },
      },
      (err) => {
        if (err) {
          console.error('Failed to log user access:', err);
        }
      }
    );
  };

  async.waterfall([checkParams, getMember, trackMemberAccess], (err, data) => {
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
