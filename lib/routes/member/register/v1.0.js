const _ = require('lodash');
const async = require('async');
const ms = require('ms');
const config = require('config');
const util = require('util');
const crypto = require('crypto');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const bcrypt = require('bcryptjs');

const MemberModel = require('../../../models/member');
const EmailVerificationTokenModel = require('../../../models/emailVerificationToken');
const redisConnection = require('../../../connections/redis');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
// const NotifyManager = require('../../../job/notifyManager');
const SystemLog = require('../../../models/systemLog');
const rp = require('request-promise');

module.exports = (req, res) => {
  let email = req.body.email || '';
  let password = req.body.password || '';
  let repassword = req.body.repassword || '';
  let phone = req.body.phone || '';
  let name = req.body.name || '';
  let memberInf;
  let verificationToken;
  let verificationUrl;
  
  const checkParams = (next) => {
    email = email.trim().toLowerCase();
    
    // Validate email
    if (!email) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập email',
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
    
    // Validate password
    if (!password || password.length < 6) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mật khẩu phải có ít nhất 6 ký tự',
        },
      });
    }
    
    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt',
        },
      });
    }
    
    // Validate repassword
    if (!repassword) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập lại mật khẩu',
        },
      });
    }
    
    // Check password match
    if (password !== repassword) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.USER.PASSWORD_NOT_SAME,
      });
    }
    
    next();
  };
  
  const checkMemberExists = (next) => {
    MemberModel.findOne({
      email: email,
    }).exec((err, member) => {
      if (err) return next(err);
      
      if (member) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: 'Thông báo',
            body: 'Email đã được đăng ký',
          },
        });
      }
      
      next();
    });
  };
  
  const hashPassword = (next) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return next(err);
      password = hash;
      next();
    });
  };
  
  const createMember = (next) => {
    const newMember = new MemberModel({
      email: email,
      password: password,
      phone: phone,
      name: name,
      status: CONSTANTS.USER_STATUS.ACTIVE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    newMember.save((err, member) => {
      if (err) return next(err);
      memberInf = member;
      next();
    });
  };
  const createVerificationToken = (next) => {
    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token có hiệu lực 24 giờ
    const expiresAt = Date.now() + ms(config.ttlEmailVerificationToken || '5m');

    const newToken = new EmailVerificationTokenModel({
      member: memberInf._id,
      token: token,
      email: memberInf.email,
      expiresAt: expiresAt,
      createdAt: Date.now(),
    });

    newToken.save((err, result) => {
      if (err) {
        console.error('Error creating verification token:', err);
        // Không return lỗi vì đăng ký đã thành công
        return next();
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
        to: memberInf.email,
        subject: 'Xác thực tài khoản - hotrothue.com',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Xác thực tài khoản</h2>
            <p>Xin chào <strong>${memberInf.name || memberInf.email}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại Hotrothue. Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
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
              Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.
            </p>
          </div>
        `,
      };

      // Gửi email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Failed to send verification email:', err);
          // Không return lỗi vì đăng ký đã thành công
        } else {
          console.log('Verification email sent:', info.messageId);
          console.log('To:', memberInf.email);
        }
        next();
      });
    } catch (error) {
      console.error('Error in sendVerificationEmail:', error);
      // Không return lỗi vì đăng ký đã thành công
      next();
    }
  };
  
  const logSystemAction = (next) => {
    const systemLog = new SystemLog({
      user: memberInf._id,
      action: 'register',
      description: 'Đăng ký tài khoản thành viên',
      data: {
        email: memberInf.email,
        phone: memberInf.phone,
        name: memberInf.name,
      },
      createdAt: Date.now(),
    });
    
    systemLog.save((err) => {
      if (err) {
        // Log error but don't stop the process
        console.error('Failed to log system action:', err);
      }
      next();
    });
  };
  
  async.waterfall([
    checkParams,
    checkMemberExists,
    hashPassword,
    createMember,
    createVerificationToken,
    sendVerificationEmail,
    logSystemAction,
  ], (err) => {
    if (_.isError(err)) {
      console.error('Register error:', err);
    }
    
    if (err) {
      return res.json(err && _.isError(err) ? {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      } : err);
    }
    
    res.json({
      code: CONSTANTS.CODE.SUCCESS,
      message: {
        head: 'Thông báo',
        body: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      },
      data: {
        email: memberInf.email,
        // Chỉ trả về URL trong môi trường development
        ...(process.env.NODE_ENV === 'development' && verificationUrl && { verificationUrl }),
      }
    });
  });
};
