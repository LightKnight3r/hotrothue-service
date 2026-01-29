const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const MembershipPackageModel = require('../../../../models/membershipPackage');
const SystemLogModel = require('../../../../models/systemLog');

module.exports = (req, res) => {
  const {
    id,
    name,
    description,
    originalPrice,
    price,
    durationInDays,
    status
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Gói thành viên không tồn tại"
        }
      });
    }
    if (name && !name.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Tên gói thành viên không hợp lệ"
        }
      });
    }
    if (originalPrice !== undefined && originalPrice < 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Giá gốc không hợp lệ"
        }
      });
    }
    if (price !== undefined && price < 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Giá bán không hợp lệ"
        }
      });
    }
    if (originalPrice !== undefined && price !== undefined && originalPrice < price) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Giá gốc không được nhỏ hơn giá bán"
        }
      });
    }
    if (durationInDays !== undefined && durationInDays <= 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Thời hạn gói không hợp lệ"
        }
      });
    }
    next();
  };

  const getOldData = (next) => {
    MembershipPackageModel.findOne({ _id: id })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Gói thành viên không tồn tại"
            }
          });
        }
        oldData = result;
        next();
      });
  };

  const updateMembershipPackage = (next) => {
    const obj = {
      updatedAt: Date.now()
    };

    if (name) obj.name = name.trim();
    if (description !== undefined) obj.description = description ? description.trim() : '';
    if (originalPrice !== undefined) obj.originalPrice = originalPrice;
    if (price !== undefined) obj.price = price;
    if (durationInDays !== undefined) obj.durationInDays = durationInDays;
    if (status !== undefined) obj.status = status;

    MembershipPackageModel.findOneAndUpdate(
      { _id: id },
      obj,
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: "Thông báo",
            body: "Cập nhật gói thành viên thất bại"
          }
        });
      }
      updatedData = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'UPDATE_MEMBERSHIP_PACKAGE',
      description: 'Cập nhật gói thành viên',
      data: {
        membershipPackageId: id,
        oldData: oldData,
        updatedData: updatedData
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData
      });
    });
  };

  async.waterfall([checkParams, getOldData, updateMembershipPackage, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
