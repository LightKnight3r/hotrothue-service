const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const SupportRequestModel = require('../../../models/supportRequest');
const SupportCategoryModel = require('../../../models/supportCategory');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  const userId = _.get(req, 'user.id', '');
  const { category, supportFields, content, attachments } = req.body;

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

    if (!category) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng chọn danh mục hỗ trợ',
        },
      });
    }

    if (!content || content.trim() === '') {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng nhập nội dung yêu cầu',
        },
      });
    }

    next();
  };

  const getMemberInfo = (next) => {
    MemberModel
      .findOne({ _id: userId })
      .lean()
      .exec((err, member) => {
        if (err) {
          return next(err);
        }
        
        if (!member) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy thông tin thành viên',
            },
          });
        }

        next(null, member);
      });
  };

  const validateCategory = (member, next) => {
    SupportCategoryModel
      .findOne({ _id: category, status: 1 })
      .lean()
      .exec((err, categoryData) => {
        if (err) {
          return next(err);
        }

        if (!categoryData) {
          return next({
            code: CONSTANTS.CODE.NOT_FOUND,
            message: {
              head: 'Thông báo',
              body: 'Danh mục hỗ trợ không tồn tại',
            },
          });
        }

        next(null, member);
      });
  };

  const createSupportRequest = (member, next) => {
    const requestData = {
      category,
      supportFields: supportFields || [],
      content: content.trim(),
      attachments: attachments || [],
      member: member._id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    SupportRequestModel.create(requestData, (err, result) => {
      if (err) {
        return next(err);
      }

      SupportRequestModel
        .findById(result._id)
        .populate('category', 'name')
        .lean()
        .exec((err, populatedResult) => {
          if (err) {
            return next(err);
          }

          next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            data: populatedResult,
            message: {
              head: 'Thành công',
              body: 'Gửi yêu cầu hỗ trợ thành công',
            }
          });
        });
    });
  };

  async.waterfall([
    checkParams,
    getMemberInfo,
    validateCategory,
    createSupportRequest,
  ], (err, data) => {
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
