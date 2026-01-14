const async = require('async');
const bcrypt = require('bcryptjs');
const config = require('config');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');

const MemberModel = require('../../../models/member');
const PasswordResetTokenModel = require('../../../models/passwordResetToken');
const SystemLog = require('../../../models/systemLog');

module.exports = (req, res) => {
  let token = req.body.token || '';
  let newPassword = req.body.newPassword || '';
  let confirmPassword = req.body.confirmPassword || '';
  let tokenInf;
  let memberInf;
  
  const checkParams = (next) => {
    token = token.trim();
    
    // Validate token
    if (!token) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mã xác thực không hợp lệ',
        },
      });
    }
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mật khẩu phải có ít nhất 6 ký tự',
        },
      });
    }
    
    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt',
        },
      });
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng nhập lại mật khẩu mới',
        },
      });
    }
    
    // Check password match
    if (newPassword !== confirmPassword) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mật khẩu xác nhận không khớp',
        },
      });
    }
    
    next();
  };

  const verifyToken = (next) => {
    PasswordResetTokenModel.findOne({
      token: token,
      used: false,
    }, (err, tokenDoc) => {
      if (err) {
        return next(err);
      }

      if (!tokenDoc) {
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: {
            head: 'Thông báo',
            body: 'Mã xác thực không hợp lệ hoặc đã được sử dụng',
          },
        });
      }

      // Kiểm tra token có hết hạn không
      if (tokenDoc.expiresAt < Date.now()) {
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: {
            head: 'Thông báo',
            body: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu lại',
          },
        });
      }

      tokenInf = tokenDoc;
      next();
    });
  };

  const getMember = (next) => {
    MemberModel.findById(tokenInf.member, (err, member) => {
      if (err) {
        return next(err);
      }

      if (!member) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Tài khoản không tồn tại',
          },
        });
      }

      memberInf = member;
      next();
    });
  };

  const updatePassword = (next) => {
    // Hash password mới
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        return next(err);
      }

      // Cập nhật password cho member
      MemberModel.updateOne(
        { _id: memberInf._id },
        {
          $set: {
            password: hashedPassword,
            lastChangedPassword: Date.now(),
            updatedAt: Date.now(),
          },
        },
        (err) => {
          if (err) {
             return next(err);
          }

          next();
        }
      );
    });
  };

  const markTokenAsUsed = (next) => {
    PasswordResetTokenModel.updateOne(
      { _id: tokenInf._id },
      {
        $set: {
          used: true,
        },
      },
      (err) => {
        if (err) {
          console.error('Error marking token as used:', err);
        }
        next();
      }
    );
  };

  const logSystemAction = (next) => {
    const systemLog = new SystemLog({
      user: memberInf._id,
      action: 'reset_password',
      description: 'Đặt lại mật khẩu thành công',
      data: {
        email: memberInf.email,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
    });

    systemLog.save((err) => {
      if (err) {
        console.error('Error logging system action:', err);
      }
      next(null,{
        code: CONSTANTS.CODE.SUCCESS,
        message: {
          head: 'Thành công',
          body: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới',
        },
      });
    });
  };


  async.waterfall(
    [
      checkParams,
      verifyToken,
      getMember,
      updatePassword,
      markTokenAsUsed,
      logSystemAction,
    ],
    (err,data) => {
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
