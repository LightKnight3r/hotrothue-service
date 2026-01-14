const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const Member = require('../../../../models/member');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const { id, money, note } = req.body || '';
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

    if (!money || money <= 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Số tiền nạp phải lớn hơn 0',
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

  const chargeMember = (next) => {
    Member.increaseMoney(id, money, (err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: {
            head: 'Thông báo',
            body: 'Không thể nạp tiền cho thành viên',
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
      action: 'CHARGE_MEMBER',
      description: 'Nạp tiền cho thành viên',
      data: {
        memberId: id,
        oldMoney: oldData.money || 0,
        chargeAmount: money,
        newMoney: updatedData.money || 0,
        note: note || '',
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
          body: `Nạp tiền thành công. Số dư mới: ${updatedData.money}`,
        },
      });
    });
  };

  async.waterfall([checkParams, checkMemberExists, chargeMember, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Charge member error:', err);
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
