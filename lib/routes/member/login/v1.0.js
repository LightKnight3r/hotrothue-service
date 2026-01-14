const _ = require('lodash');
const async = require('async');
const ms = require('ms');
const config = require('config');
const util = require('util');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const bcrypt = require('bcryptjs');

const MemberModel = require('../../../models/member');
const redisConnection = require('../../../connections/redis');
const jwt = require('jsonwebtoken');
// const NotifyManager = require('../../../job/notifyManager');
const SystemLog = require('../../../models/systemLog');
const rp = require('request-promise');

module.exports = (req, res) => {
  let email = req.body.email || '';
  let password = req.body.password || '';
  let memberInf;

  let stringToken = 'member';

  const checkParams = (next) => {
    email = email.trim();
    if (!email) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Email đăng nhập',
        },
      });
    }
    if (!password.trim()) {
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
    MemberModel.find({
      email: email
    })
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
              body: 'Email đăng nhập chưa chính xác',
            },
          });
        }
        if (results.length > 1) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: MESSAGES.SYSTEM.ERROR,
          });
        }
        memberInf = results[0];
        if (memberInf.status == 0) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: MESSAGES.USER.INACTIVE,
          });
        }
        if (!memberInf.password) {
          return next({
            code: CONSTANTS.CODE.SYSTEM_ERROR,
            message: {
              head: 'Thông báo',
              body: 'Tài khoản không tồn tại, vui lòng kiểm tra lại hoặc đăng nhập bằng phương thức khác',
            },
          });
        } else {
          bcrypt.compare(password, memberInf.password, (err, isMatch) => {
            if (err) {
              return next(err);
            }
            if (!isMatch) {
              return next({
                code: CONSTANTS.CODE.SYSTEM_ERROR,
                message: {
                  head: 'Thông báo',
                  body: 'Mật khẩu chưa chính xác',
                },
              });
            }
            return next();
          });
        }
      });
  };

  const deleteOldToken = (next) => {
    const userId = memberInf._id.toHexString();
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
    const token = jwt.sign({ email, id: memberInf._id }, config.secretKey);

    const userId = memberInf._id.toHexString();
    const objSign = {
      id: userId
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

        const data = _.merge({}, memberInf, { token });
        _.unset(data, 'password');
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
            user: memberInf._id,
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
  async.waterfall([checkParams, findUser, deleteOldToken, createNewToken], (err, data) => {
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
