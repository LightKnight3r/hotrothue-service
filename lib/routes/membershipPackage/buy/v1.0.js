const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MembershipPackageModel = require('../../../models/membershipPackage');
const MemberModel = require('../../../models/member');
const TransactionLogModel = require('../../../models/transactionLog');

module.exports = (req, res) => {
  const { packageId } = req.body;
  const userId = _.get(req, 'user.id', '');
  let memberData;
  let packageData;
  let updatedMember;

  const checkParams = (next) => {
    if (!userId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Không tìm thấy thông tin người dùng',
        },
      });
    }

    if (!packageId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng chọn gói thành viên',
        },
      });
    }
    
    next();
  };

  const getMemberInfo = (next) => {
    MemberModel.findOne({ _id: userId })
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
              body: 'Không tìm thấy thông tin thành viên',
            },
          });
        }
        memberData = result;
        next();
      });
  };

  const getPackageInfo = (next) => {
    MembershipPackageModel.findOne({ _id: packageId, status: 1 })
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
              body: 'Gói thành viên không tồn tại hoặc đã ngừng cung cấp',
            },
          });
        }
        packageData = result;
        next();
      });
  };

  const checkBalance = (next) => {
    if (memberData.money < packageData.price) {
      return next({
        code: CONSTANTS.CODE.FAIL,
        message: {
          head: 'Thông báo',
          body: 'Số dư không đủ để mua gói thành viên này',
        },
      });
    }
    next();
  };

  const deductMoney = (next) => {
    MemberModel.decreaseMoney(userId, packageData.price, (err, result) => {
      if (err) {
        return next(err);
      }
      updatedMember = result;
      next();
    });
  };

  const updateMembershipExpiry = (next) => {
    const currentExpiredTime = memberData.expiredTime || Date.now();
    const newExpiredTime = Math.max(currentExpiredTime, Date.now()) + (packageData.durationInDays * 24 * 60 * 60 * 1000);

    MemberModel.findOneAndUpdate(
      { _id: userId },
      { 
        expiredTime: newExpiredTime,
        updatedAt: Date.now()
      },
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      updatedMember = result;
      next();
    });
  };

  const createTransactionLog = (next) => {
    const logData = {
      member: userId,
      data: {
        type: CONSTANTS.TRANSACTION_TYPE.BUY_MEMBERSHIP_PACKAGE,
        packageId: packageData._id,
        packageName: packageData.name,
        price: packageData.price,
        durationInDays: packageData.durationInDays,
        oldExpiredTime: memberData.expiredTime,
        newExpiredTime: updatedMember.expiredTime,
        initialMoney: memberData.money,
        finalMoney: updatedMember.money
      },
      message: `Mua gói thành viên`,
      createdAt: Date.now()
    };

    TransactionLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error creating transaction log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: {
          member: updatedMember,
          package: packageData
        },
        message: {
          head: 'Thành công',
          body: 'Mua gói thành viên thành công',
        }
      });
    });
  };

  async.waterfall([
    checkParams,
    getMemberInfo,
    getPackageInfo,
    checkBalance,
    deductMoney,
    updateMembershipExpiry,
    createTransactionLog
  ], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
