const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const MembershipPackageModel = require('../../../../models/membershipPackage');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const {
    name,
    description,
    originalPrice,
    price,
    durationInDays,
    status
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newMembershipPackage;

  const checkParams = (next) => {
    if (!name || !name.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập tên gói thành viên',
        },
      });
    }
    if (!originalPrice || originalPrice < 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Giá gốc không hợp lệ',
        },
      });
    }
    if (!price || price < 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Giá bán không hợp lệ',
        },
      });
    }
    if (!durationInDays || durationInDays <= 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Thời hạn gói không hợp lệ',
        },
      });
    }
    next();
  };

  const createMembershipPackage = (next) => {
    const obj = {
      name: name.trim(),
      originalPrice: originalPrice,
      price: price,
      durationInDays: durationInDays
    };

    if (description) obj.description = description.trim();
    if (status !== undefined) obj.status = status;

    MembershipPackageModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newMembershipPackage = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_MEMBERSHIP_PACKAGE',
      description: 'Tạo mới gói thành viên',
      data: {
        membershipPackageId: newMembershipPackage._id,
        packageInfo: {
          name: newMembershipPackage.name,
          originalPrice: newMembershipPackage.originalPrice,
          price: newMembershipPackage.price,
          durationInDays: newMembershipPackage.durationInDays,
          status: newMembershipPackage.status
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
        data: newMembershipPackage,
      });
    });
  };

  async.waterfall([checkParams, createMembershipPackage, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
