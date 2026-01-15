const _ = require('lodash');
const async = require('async');
const crypto = require('crypto');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MemberModel = require('../../../models/member');
const EmailVerificationTokenModel = require('../../../models/emailVerificationToken');
const config = require('config');
const ms = require('ms');
const nodemailer = require('nodemailer');

module.exports = (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  let memberInfo;
  let verificationToken;
  let verificationUrl;

  const checkParams = (next) => {
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

  const findMember = (next) => {
    MemberModel.findOne({
      email: email,
      status: CONSTANTS.USER_STATUS.ACTIVE,
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
            body: 'Không tìm thấy tài khoản với email này',
          },
        });
      }

      if (result.hasVerifiedEmail) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Email đã được xác thực',
          },
        });
      }

      memberInfo = result;
      next();
    });
  };

  const deleteOldTokens = (next) => {
    // Xóa các token cũ chưa sử dụng của user
    EmailVerificationTokenModel.deleteMany({
      member: memberInfo._id,
      used: false,
    }).exec((err) => {
      if (err) {
        console.error('Error deleting old tokens:', err);
      }
      next();
    });
  };

  const createVerificationToken = (next) => {
    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    
    const expiresAt = Date.now() + ms(config.ttlEmailVerificationToken || '5m');

    const newToken = new EmailVerificationTokenModel({
      member: memberInfo._id,
      token: token,
      email: memberInfo.email,
      expiresAt: expiresAt,
      createdAt: Date.now(),
    });

    newToken.save((err, result) => {
      if (err) {
        return next(err);
      }

      verificationToken = result.token;
      
      // Tạo URL xác thực
      const baseUrl = config.proxyRequestServer.webUrl || 'http://localhost:3000';
      verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      
      next();
    });
  };

  const sendVerificationEmail = (next) => {
    if (!verificationUrl) {
      return next();
    }

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
        to: memberInfo.email,
        subject: 'Xác thực tài khoản - hotrothue.com',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Xác thực tài khoản</h2>
            <p>Xin chào <strong>${memberInfo.name || memberInfo.email}</strong>,</p>
            <p>Bạn đã yêu cầu gửi lại email xác thực. Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Xác thực email
              </a>
            </div>
            <p>Hoặc sao chép và dán link sau vào trình duyệt:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="color: #666; font-size: 14px;">
              <strong>Lưu ý:</strong> Link xác thực này chỉ có hiệu lực trong 5 phút.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
            </p>
          </div>
        `,
      };

      // Gửi email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Failed to send verification email:', err);
          // Không return lỗi vì quá trình đã thành công
        } else {
          console.log('Verification email sent:', info.messageId);
          console.log('To:', memberInfo.email);
        }
        next();
      });
    } catch (error) {
      console.error('Error in sendVerificationEmail:', error);
      // Không return lỗi vì quá trình đã thành công
      next();
    }
  };

  async.waterfall([
    checkParams,
    findMember,
    deleteOldTokens,
    createVerificationToken,
    sendVerificationEmail,
  ], (err) => {
    if (_.isError(err)) {
      console.error('Error resending verification email:', err);
      return res.json({
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: {
          head: 'Thông báo',
          body: 'Có lỗi xảy ra khi gửi email xác thực',
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
        body: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn',
      },
      data: {
        email: memberInfo.email,
        // Chỉ trả về URL trong môi trường development
        ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
      },
    });
  });
};
