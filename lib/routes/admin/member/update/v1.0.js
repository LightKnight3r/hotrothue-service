const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const validator = require('validator');

const Member = require('../../../../models/member');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  let {
    name,
    phone,
    email,
    address,
    dob,
    avatar,
    companyInfo
  } = req.body || '';
  const _id = req.body._id || '';
  const userId = _.get(req, 'user.id', '');
  let objUpdate = {};
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!_id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'ID thành viên không được để trống',
        },
      });
    }

    if (email && email.trim() && !validator.isEmail(email)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Email không hợp lệ',
        },
      });
    }

    next(null);
  };

  const checkMemberExists = (next) => {
    Member.findById(_id)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên không tồn tại',
            },
          });
        }
        if (result.status === 0) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên đã bị xóa',
            },
          });
        }
        oldData = result;
        next();
      });
  };

  const checkDuplicateInfo = (next) => {
    const queryConditions = [];

    // Kiểm tra email trùng nếu có thay đổi
    if (email && email.trim() && email.trim() !== oldData.email) {
      queryConditions.push({ email: email.trim() });
    }

    // Kiểm tra phone trùng nếu có thay đổi
    if (phone && phone.trim() && phone.trim() !== oldData.phone) {
      queryConditions.push({ phone: phone.trim() });
    }

    if (queryConditions.length === 0) {
      return next();
    }

    Member.find({
      _id: {
        $ne: _id,
      },
      $or: queryConditions,
      status: 1,
    })
      .lean()
      .exec((err, results) => {
        if (err) {
          return next(err);
        }
        if (results.length) {
          const existingMember = results[0];
          let errorMessage = {
            head: 'Thông báo',
            body: 'Thông tin đã tồn tại',
          };

          if (existingMember.email === (email && email.trim())) {
            errorMessage = {
              head: 'Thông báo',
              body: 'Email đã tồn tại',
            };
          } else if (existingMember.phone === (phone && phone.trim())) {
            errorMessage = {
              head: 'Thông báo',
              body: 'Số điện thoại đã tồn tại',
            };
          }

          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: errorMessage,
          });
        }
        next();
      });
  };

  const updateMember = (next) => {
    objUpdate = {
      updatedAt: Date.now(),
    };

    // Chỉ cập nhật các trường được phép
    if (name && name.trim()) {
      objUpdate.name = name.trim();
    }
    if (phone && phone.trim()) {
      objUpdate.phone = phone.trim();
    }
    if (email && email.trim()) {
      objUpdate.email = email.trim();
    }
    if (address !== undefined) {
      objUpdate.address = address;
    }
    if (dob !== undefined) {
      objUpdate.dob = dob;
    }
    if (avatar !== undefined) {
      objUpdate.avatar = avatar;
    }

    // Cập nhật thông tin công ty nếu có
    if (companyInfo) {
      if (companyInfo.companyName !== undefined) {
        objUpdate['companyInfo.companyName'] = companyInfo.companyName;
      }
      if (companyInfo.companyAddress !== undefined) {
        objUpdate['companyInfo.companyAddress'] = companyInfo.companyAddress;
      }
      if (companyInfo.companyPhone !== undefined) {
        objUpdate['companyInfo.companyPhone'] = companyInfo.companyPhone;
      }
      if (companyInfo.taxCode !== undefined) {
        objUpdate['companyInfo.taxCode'] = companyInfo.taxCode;
      }
    }

    Member.findOneAndUpdate(
      {
        _id,
        status: 1,
      },
      objUpdate,
      { new: true }
    )
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.WRONG_PARAMS,
            message: {
              head: 'Thông báo',
              body: 'Thành viên không tồn tại hoặc đã bị xóa',
            },
          });
        }
        updatedData = result;
        next();
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'UPDATE_MEMBER',
      description: 'Cập nhật thông tin thành viên',
      data: {
        memberId: _id,
        oldData: oldData,
        updateFields: objUpdate,
      },
      updatedData: updatedData,
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData,
        message: {
          head: 'Thông báo',
          body: 'Cập nhật thông tin thành viên thành công',
        },
      });
    });
  };

  async.waterfall(
    [checkParams, checkMemberExists, checkDuplicateInfo, updateMember, writeLog],
    (err, data) => {
      if (_.isError(err)) {
        console.error('Update member error:', err);
      }

      err &&
        _.isError(err) &&
        (data = {
          code: CONSTANTS.CODE.SYSTEM_ERROR,
          message: MESSAGES.SYSTEM.ERROR || {
            head: 'Thông báo',
            body: 'Lỗi hệ thống',
          },
        });

      res.json(data || err);
    }
  );
};
