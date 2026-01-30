const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const SupportRequestModel = require('../../../models/supportRequest');
const MemberModel = require('../../../models/member');

module.exports = (req, res) => {
  const userId = _.get(req, 'user.id', '');
  const page = parseInt(_.get(req, 'query.page', 1));
  const limit = parseInt(_.get(req, 'query.limit', 10));

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

    if (page < 1 || limit < 1 || limit > 100) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Tham số phân trang không hợp lệ',
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

  const listSupportRequests = (member, next) => {
    const skip = (page - 1) * limit;
    const query = { member: member._id };

    async.parallel({
      total: (cb) => {
        SupportRequestModel.countDocuments(query, cb);
      },
      data: (cb) => {
        SupportRequestModel
          .find(query)
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(cb);
      }
    }, (err, result) => {
      if (err) {
        return next(err);
      }

      const totalPages = Math.ceil(result.total / limit);

      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: {
          items: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages
          }
        }
      });
    });
  };

  async.waterfall([
    checkParams,
    getMemberInfo,
    listSupportRequests,
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
