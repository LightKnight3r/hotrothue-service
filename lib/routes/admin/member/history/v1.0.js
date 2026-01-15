const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const SystemLogModel = require('../../../../models/systemLog');
const Member = require('../../../../models/member');
const User = require('../../../../models/user');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

const escapeStringRegexp = require('escape-string-regexp');

module.exports = (req, res) => {
  const limit = Math.max(1, Math.min(100, _.get(req, 'body.limit', 10)));
  const page = Math.max(0, _.get(req, 'body.page', 0));
  const sort = _.get(req, 'body.sort', '-createdAt');
  const textSearch = _.get(req, 'body.textSearch', '');
  const memberId = _.get(req, 'body.memberId', null);
  const userId = _.get(req, 'user.id', '');
  let obj = {
    action: 'CHARGE_MEMBER',
  };
  let count = 0;
  let memberIds = [];

  const checkParams = (next) => {
    // Nếu có memberId cụ thể, filter theo đó
    if (memberId) {
      obj['data.memberId'] = memberId;
      return next();
    }

    // Nếu có textSearch, tìm member theo text trước
    if (textSearch && textSearch.trim()) {
      const $regex = escapeStringRegexp(textSearch.trim());
      Member.find({
        $or: [
          {
            name: {
              $regex,
              $options: 'i',
            },
          },
          {
            phone: {
              $regex,
              $options: 'i',
            },
          },
          {
            email: {
              $regex,
              $options: 'i',
            },
          },
          {
            code: {
              $regex,
              $options: 'i',
            },
          },
        ],
      })
        .select('_id')
        .lean()
        .exec((err, members) => {
          if (err) {
            return next(err);
          }
          if (members && members.length > 0) {
            memberIds = members.map((m) => m._id.toString());
            obj['data.memberId'] = { $in: memberIds };
          } else {
            // Không tìm thấy member nào, set điều kiện không thể match
            obj['data.memberId'] = 'no-match';
          }
          next();
        });
    } else {
      next();
    }
  };

  const countHistory = (next) => {
    SystemLogModel.countDocuments(obj)
      .lean()
      .exec((err, total) => {
        if (err) {
          return next(err);
        }
        count = Math.ceil(total / limit);
        next();
      });
  };

  const listHistory = (next) => {
    const skip = page * limit;
    const options = {
      limit,
      skip,
      sort,
    };
    SystemLogModel.find(obj, null, options)
      .populate('user', 'name username email')
      .lean()
      .exec((err, results) => {
        if (err) {
          return next(err);
        }

        // Lấy thông tin member cho mỗi log
        const memberIdsToFetch = results
          .map((log) => _.get(log, 'data.memberId'))
          .filter((id) => id);

        if (memberIdsToFetch.length === 0) {
          return next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            data: results,
            count,
            total: count * limit,
            page,
            limit,
          });
        }

        Member.find({ _id: { $in: memberIdsToFetch } })
          .select('_id name phone email code')
          .lean()
          .exec((err, members) => {
            if (err) {
              return next(err);
            }

            // Map member info vào results
            const memberMap = {};
            members.forEach((m) => {
              memberMap[m._id.toString()] = m;
            });

            const enrichedResults = results.map((log) => {
              const memberId = _.get(log, 'data.memberId');
              return {
                ...log,
                memberInfo: memberMap[memberId] || null,
              };
            });

            next(null, {
              code: CONSTANTS.CODE.SUCCESS,
              data: enrichedResults,
              count,
              total: count * limit,
              page,
              limit,
            });
          });
      });
  };

  const writeLog = (data, next) => {
    const logData = {
      user: userId,
      action: 'VIEW_CHARGE_HISTORY',
      description: 'Xem lịch sử nạp tiền',
      data: {
        filter: obj,
        page,
        limit,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, data);
    });
  };

  async.waterfall([checkParams, countHistory, listHistory, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('List charge history error:', err);
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
