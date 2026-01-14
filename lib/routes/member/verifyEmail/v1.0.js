const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MemberModel = require('../../../models/member');
const EmailVerificationTokenModel = require('../../../models/emailVerificationToken');
const SystemLog = require('../../../models/systemLog');

module.exports = (req, res) => {
  const token = req.body.token || '';
  let tokenData;
  let memberInfo;

  const checkParams = (next) => {
    if (!token) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Token xác thực không hợp lệ',
        },
      });
    }
    next();
  };

  const findToken = (next) => {
    EmailVerificationTokenModel.findOne({
      token: token,
      used: false,
    })
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
            body: 'Token xác thực không tồn tại hoặc đã được sử dụng',
          },
        });
      }

      // Kiểm tra token đã hết hạn chưa
      if (result.expiresAt < Date.now()) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Token xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực',
          },
        });
      }

      tokenData = result;
      next();
    });
  };

  const verifyEmail = (next) => {
    MemberModel.findByIdAndUpdate(
      tokenData.member,
      {
        hasVerifiedEmail: true,
        updatedAt: Date.now(),
      },
      { new: true }
    )
    .select('-password')
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
            body: 'Không tìm thấy thông tin tài khoản',
          },
        });
      }

      memberInfo = result;
      next();
    });
  };

  const markTokenAsUsed = (next) => {
    EmailVerificationTokenModel.findOneAndUpdate(
      { token: token },
      { used: true }
    ).exec((err) => {
      if (err) {
        console.error('Error marking token as used:', err);
        // Không return lỗi vì việc xác thực đã thành công
      }
      next();
    });
  };

  const logSystemAction = (next) => {
    const systemLog = new SystemLog({
      user: memberInfo._id,
      action: 'verify_email',
      description: 'Xác thực email thành viên',
      data: {
        email: memberInfo.email,
      },
      createdAt: Date.now(),
    });

    systemLog.save((err) => {
      if (err) {
        console.error('Failed to log system action:', err);
      }
      next();
    });
  };

  async.waterfall([
    checkParams,
    findToken,
    verifyEmail,
    markTokenAsUsed,
    logSystemAction,
  ], (err) => {
    if (_.isError(err)) {
      console.error('Error verifying email:', err);
      return res.json({
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: {
          head: 'Thông báo',
          body: 'Có lỗi xảy ra trong quá trình xác thực email',
        },
      });
    }

    if (err) {
      return res.json(err);
    }

    return res.json({
      code: CONSTANTS.CODE.SUCCESS,
      message: {
        head: 'Thông báo',
        body: 'Xác thực email thành công',
      },
      data: {
        email: memberInfo.email,
        hasVerifiedEmail: memberInfo.hasVerifiedEmail,
      },
    });
  });
};
