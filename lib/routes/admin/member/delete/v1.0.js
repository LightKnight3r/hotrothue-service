const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const Member = require('../../../../models/member');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id } = req.body || '';
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
        if (result.status === 0) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên đã bị xóa',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteMember = (next) => {
    Member.findOneAndUpdate(
      {
        _id: id,
        status: 1,
      },
      {
        status: 0,
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
              body: 'Không thể xóa thành viên',
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
      action: 'DELETE_MEMBER',
      description: 'Xóa tài khoản thành viên',
      data: {
        memberId: id,
        memberInfo: {
          name: oldData.name,
          phone: oldData.phone,
          email: oldData.email,
          code: oldData.code,
        },
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
        data: {
          _id: updatedData._id,
          name: updatedData.name,
          status: updatedData.status,
          updatedAt: updatedData.updatedAt,
        },
        message: {
          head: 'Thông báo',
          body: 'Xóa tài khoản thành viên thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, checkMemberExists, deleteMember, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Delete member error:', err);
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
