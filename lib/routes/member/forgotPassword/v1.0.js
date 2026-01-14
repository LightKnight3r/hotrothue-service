const async = require('async');
const crypto = require('crypto');
const ms = require('ms');
const config = require('config');
const nodemailer = require('nodemailer');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');

const MemberModel = require('../../../models/member');
const PasswordResetTokenModel = require('../../../models/passwordResetToken');
const SystemLog = require('../../../models/systemLog');

module.exports = (req, res) => {
  let email = req.body.email || '';
  let memberInf;
  let resetToken;
  let resetUrl;
  
  const checkParams = (next) => {
    email = email.trim().toLowerCase();
    
    // Validate email
    if (!email) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng nhập email',
        },
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Email không đúng định dạng',
        },
      });
    }
    
    next();
  };

  const checkMemberExists = (next) => {
    MemberModel.findOne({ email: email }, (err, member) => {
      if (err) {
        return next(err)
      }

      if (!member) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Email này chưa được đăng ký',
          },
        });
      }

      memberInf = member;
      next();
    });
  };

  const deleteOldTokens = (next) => {
    // Xóa các token reset password cũ của user này
    PasswordResetTokenModel.deleteMany({
      member: memberInf._id,
    }, (err) => {
      if (err) {
        console.error('Error deleting old tokens:', err);
      }
      next();
    });
  };

  const createResetToken = (next) => {
    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token có hiệu lực 1 giờ
    const expiresAt = Date.now() + ms('1h');

    const newToken = new PasswordResetTokenModel({
      member: memberInf._id,
      token: token,
      email: memberInf.email,
      expiresAt: expiresAt,
      createdAt: Date.now(),
    });

    newToken.save((err, result) => {
      if (err) {
        return next(err);
      }

      resetToken = result.token;
      
      // Tạo URL reset password
      const baseUrl = config.proxyRequestServer.webUrl || 'http://localhost:3000';
      resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      next();
    });
  };

  const sendResetEmail = (next) => {
    try {
      // Tạo transporter từ config
      const transporter = nodemailer.createTransport({
        service: config.emailInfo.service,
        auth: {
          user: config.emailInfo.auth.user,
          pass: config.emailInfo.auth.pass,
        },
      });

      // Thiết lập nội dung email
      const mailOptions = {
        from: `"Hỗ trợ thuế" <${config.emailInfo.auth.user}>`,
        to: memberInf.email,
        subject: 'Đặt lại mật khẩu - hotrothue.com',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Đặt lại mật khẩu</h2>
            <p>Xin chào <strong>${memberInf.name || memberInf.email}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiếp tục:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p>Hoặc sao chép và dán link sau vào trình duyệt:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetUrl}
            </p>
            <p style="color: #666; font-size: 14px;">
              <strong>Lưu ý:</strong> Link này chỉ có hiệu lực trong 1 giờ.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </div>
        `,
      };

      // Gửi email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return next(err);
        }

        console.log('Reset password email sent:', info.messageId);
        console.log('To:', memberInf.email);
        next();
      });
    } catch (error) {
      console.error('Error in sendResetEmail:', error);
      return next({
        code: CONSTANTS.CODE.WRONG_PROCESS,
        message: {
          head: 'Lỗi',
          body: 'Không thể gửi email. Vui lòng thử lại sau',
        },
      });
    }
  };

  const logSystemAction = (next) => {
    const systemLog = new SystemLog({
      user: memberInf._id,
      action: 'forgot_password',
      description: 'Yêu cầu đặt lại mật khẩu',
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
          body: 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn',
        },
      });
    });
  };


  async.waterfall(
    [
      checkParams,
      checkMemberExists,
      deleteOldTokens,
      createResetToken,
      sendResetEmail,
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
    }
  );
};
