const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const Member = require('../../../../models/member');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id, blockUtil } = req.body || '';
  const userId = _.get(req, 'user.id', '');
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'ID thành viên không được để trống',
        },
      });
    }

    if (blockUtil === null || blockUtil === undefined) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Thời gian khóa tài khoản không được để trống',
        },
      });
    }

    next(null);
  };

  const checkMemberExists = (next) => {
    Member.findById(id)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const blockMember = (next) => {
    Member.findOneAndUpdate(
      {
        _id: id,
      },
      {
        blockUtil: blockUtil,
        updatedAt: Date.now(),
      },
      { new: true }
    )
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên không tồn tại',
            },
          });
        }
        updatedData = result;
        next(null);
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'BLOCK_MEMBER',
      description: blockUtil > 0 ? 'Khóa tài khoản thành viên' : 'Mở khóa tài khoản thành viên',
      data: {
        memberId: id,
        oldBlockUtil: oldData.blockUtil,
        newBlockUtil: blockUtil,
      },
      updatedData: updatedData,
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData,
        message: {
          head: 'Thông báo',
          body: blockUtil > 0 ? 'Khóa tài khoản thành viên thành công' : 'Mở khóa tài khoản thành viên thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkMemberExists, blockMember, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Block member error:', err);
    }

    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR || {
          head: 'Thông báo',
          body: 'Lỗi hệ thống',
        },
      });

    res.json(data || err);
  });
};
