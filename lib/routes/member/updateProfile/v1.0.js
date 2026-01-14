const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const MemberModel = require('../../../models/member');
const SystemLog = require('../../../models/systemLog');
const Validator = require('validator');

module.exports = (req, res) => {
  
  const name = req.body.name || '';
  const phone = req.body.phone || '';
  const companyName = req.body.companyName || '';
  const companyAddress = req.body.companyAddress || '';
  const taxCode = req.body.taxCode || '';
  const userId = _.get(req, 'user.id', '');
  let memberInfo;

  const checkParams = (next) => {
    if (!name) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Họ và tên',
        },
      });
    }
    if(!phone) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Số điện thoại',
        },
      });
    }
    if(!Validator.isMobilePhone(phone, 'vi-VN')) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Số điện thoại không đúng định dạng',
        },
      });
    }
    if(!companyName) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Tên công ty',
        },
      });
    }
    if(!companyAddress) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Địa chỉ công ty',
        },
      });
    }
    if(!taxCode) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập Mã số thuế',
        },
      });
    }

    next();
  };

  const checkMemberExists = (next) => {
    MemberModel
      .findOne({
        _id: userId,
      })
      .exec((err, data) => {
        if (err) {
          return next(err);
        }

        if (!data) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Thành viên không tồn tại',
            }
          });
        }
        memberInfo = data;
        next()
      })
  }
  const updateMember = (next) => {
    MemberModel.findByIdAndUpdate(
      userId,
      {
        name, 
        phone,
        'companyInfo.companyName': companyName,
        'companyInfo.companyAddress': companyAddress,
        'companyInfo.taxCode': taxCode,
        updatedAt: Date.now(),
        hasCompanyInfo: true,
      },
      { new: true },
      (err, data) => {
        if (err) {
          return next(err);
        }

        // Log hệ thống
        const log = new SystemLog({
          user: userId,
          action: 'update_profile',
          description: 'Cập nhật hồ sơ thành viên',
          data: data,
          createdAt: Date.now(),
        });

        log.save((saveLogErr) => {
          if (saveLogErr) {
            console.error('Error saving system log:', saveLogErr);
          }
          // Bất kể lỗi log hệ thống có hay không cũng không ảnh hưởng đến việc trả về kết quả cập nhật hồ sơ
          next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            data
          });
        });
      }
    );
  }

  async.waterfall([
    checkParams,
    checkMemberExists,
    updateMember
  ], (err,data) => {
    if (_.isError(err)) {
      console.error('Error verifying email:', err);
      return res.json({
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });
    }

    if (err) {
      return res.json(err);
    }


    res.json(data || err);
  });
};
