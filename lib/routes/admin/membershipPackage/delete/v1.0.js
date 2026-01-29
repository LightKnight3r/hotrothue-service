const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const MembershipPackageModel = require('../../../../models/membershipPackage');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const { id } = req.body;
  const userId = _.get(req, 'user.id', '');
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS,
      });
    }
    next();
  };

  const getOldData = (next) => {
    MembershipPackageModel.findById(id)
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
              body: 'Gói thành viên không tồn tại',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const deleteMembershipPackage = (next) => {
    MembershipPackageModel.findByIdAndUpdate(
      id,
      { status: 0, updatedAt: Date.now() },
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Xóa gói thành viên thất bại',
          },
        });
      }
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'DELETE_MEMBERSHIP_PACKAGE',
      description: 'Xóa gói thành viên',
      data: {
        membershipPackageId: id,
        packageInfo: {
          name: oldData.name,
          originalPrice: oldData.originalPrice,
          price: oldData.price,
          durationInDays: oldData.durationInDays
        },
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        message: {
          head: 'Thông báo',
          body: 'Xóa gói thành viên thành công',
        },
      });
    });
  };

  async.waterfall([checkParams, getOldData, deleteMembershipPackage, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
