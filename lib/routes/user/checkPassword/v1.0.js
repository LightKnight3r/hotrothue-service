const _ = require('lodash');
const async = require('async');
const ms = require('ms');
const config = require('config');
const util = require('util');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const bcrypt = require('bcryptjs');

const UserModel = require('../../../models/user');
const redisConnection = require('../../../connections/redis');
const jwt = require('jsonwebtoken');
const SystemLog = require('../../../models/systemLog');
const rp = require('request-promise');

module.exports = (req, res) => {
  let username = req.body.username || '';
  const password = req.body.password || '';
  let userInf;


  const checkParams = (next) => {
    username = username.trim();
    if (!username) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập tên đăng nhập',
        },
      });
    }
    if (!password) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập mật khẩu',
        },
      });
    }
    next();
  };

  const findUser = (next) => {
    UserModel.find({
      $or: [{ username: username }, { email: username }],
    })
    .populate('permissions','name code')
      .lean()
      .exec((err, results) => {
        if (err) {
          return next(err);
        }
        if (!results.length) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: {
              head: 'Thông báo',
              body: 'Tên đăng nhập chưa chính xác',
            },
          });
        }
        if (results.length > 1) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: MESSAGES.SYSTEM.ERROR,
          });
        }
        userInf = results[0];
        if (userInf.status == 0) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: MESSAGES.USER.INACTIVE,
          });
        }
        if(!userInf.phone) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Tài khoản chưa có số điện thoại, vui lòng liên hệ admin để được cấp nhật số điện thoại.',
            },
          });
        }
        next();
      });
  };

  const checkPassword = (next) => {
    if (!userInf.password) {
      return next({
        code: CONSTANTS.CODE.FAIL,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa có mật khẩu, vui lòng liên hệ admin để được cấp mật khẩu.',
        },
      });
    }
    bcrypt.compare(password, userInf.password, function (err, res) {
      if (err) {
        return next(err);
      }

      if (!res) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Mật khẩu không chính xác, vui lòng thử lại. Xin cảm ơn.',
          },
        });
      }
      next();
    });
  };



  const sendOTP = (next) => {
   const options = {
      method: 'POST',
      uri: `${config.proxyRequestServer.codePhoneAddr}/api/v2.0/send-code`,
      body: {
          phone: userInf.phone,
          ip: req.headers['x-forwarded-for'],
          deviceId: req.body.deviceId,
          platform: 'web'
      },
      json: true // Automatically stringifies the body to JSON
    };

    rp(options)
      .then((result) => {
        next(null, result);
      })
      .catch((err) => {
        next(err);
      });
  };

  async.waterfall([checkParams, findUser, checkPassword, sendOTP], (err, data) => {
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
