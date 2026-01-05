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
// const NotifyManager = require('../../../job/notifyManager');
const SystemLog = require('../../../models/systemLog');
const rp = require('request-promise');

module.exports = (req, res) => {
  let username = req.body.username || '';
  const token = req.body.token;
  const code = req.body.code;
  let userInf;

  let stringToken = 'user';

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
    if (!token) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    if(!code) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
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
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: {
              head: 'Thông báo',
              body: 'Tài khoản chưa có số điện thoại đăng ký',
            },
          });
        }
        next();
      });
  };

  const checkToken = (next) => {
    const options = {
      method: 'POST',
      uri: `${config.proxyRequestServer.codePhoneAddr}/api/v1.0/check-code`,
      body: {
          token, code, phone: userInf.phone
      },
      json: true // Automatically stringifies the body to JSON
    };

    rp(options)
      .then((result) => {
        if(!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: MESSAGES.SYSTEM.ERROR
          })
        }
        if(result && result.code !== CONSTANTS.CODE.SUCCESS) {
          return next(result)
        }

        next();
      })
      .catch((err) => {
        next(err);
      });
  }

  const deleteOldToken = (next) => {
    const userId = userInf._id.toHexString();
    redisConnection('master')
      .getConnection()
      .get(`${stringToken}:${userId}`, (err, token) => {
        if (err) {
          return next(err);
        }

        if (token) {
          redisConnection('master')
            .getConnection()
            .del(`${stringToken}:${token}`, (err, result) => {
              if (err) {
                return next(err);
              }
              next();
            });
        } else {
          next();
        }
      });
  };

  const createNewToken = (next) => {
    const token = jwt.sign({ username, id: userInf._id }, config.secretKey);

    const userId = userInf._id.toHexString();
    const permissions = userInf.permissions;
    const objSign = {
      id: userId,
      permissions
    };

    const ttl = config.sessionInMins * 60; 
    
    redisConnection('master')
      .getConnection()
      .multi()
      .setex(`${stringToken}:${userId}`, ttl, token)
      .setex(`${stringToken}:${token}`, ttl, JSON.stringify(objSign))
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        const data = _.merge({}, userInf, { token });
        _.unset(data, 'password');
        _.unset(data, 'passwordLevel2');
        let deviceName = '';
        let device = {};
        if (req.headers.device) {
          device = JSON.parse(req.headers.device);
          deviceName = `${_.get(device, 'device.brand', '')} ${_.get(device, 'os.name', '')} - ${_.get(device, 'os.version', '')}:${_.get(device, 'client.name', '')} - ${_.get(device, 'client.version', '')}`;
          if (req.headers.ip) {
            device.ip = req.headers.ip;
          }
        }

        SystemLog.create(
          {
            user: userInf._id,
            action: 'log_in',
            description: 'Đăng nhập',
            data: device,
          },
          () => {}
        );
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data,
        });
      });
  };
  async.waterfall([checkParams, findUser, checkToken, deleteOldToken, createNewToken], (err, data) => {
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
