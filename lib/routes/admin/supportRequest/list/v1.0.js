const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const SupportRequest = require('../../../../models/supportRequest');
const SystemLogModel = require('../../../../models/systemLog');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = (req, res) => {
  const limit = Math.max(1, Math.min(100, _.get(req, 'body.limit', 10)));
  const page = Math.max(0, _.get(req, 'body.page', 0));
  const sort = _.get(req, 'body.sort', '-createdAt');
  const textSearch = _.get(req, 'body.textSearch', '');
  const status = _.get(req, 'body.status', null);
  const category = _.get(req, 'body.category', '');
  const userId = _.get(req, 'user.id', '');
  let obj = {};
  let count = 0;

  const checkParams = (next) => {
    if (status !== null && status !== undefined && status !== '') {
      obj.status = parseInt(status);
    }

    if (category && category.trim()) {
      obj.category = category.trim();
    }

    if (textSearch && textSearch.trim()) {
      const $regex = escapeStringRegexp(textSearch.trim());
      obj['$or'] = [
        {
          content: {
            $regex,
            $options: 'gi',
          },
        },
      ];
    }

    if(category && category.trim()) {
      obj.category = category.trim();
    }
    next();
  };

  const countRequests = (next) => {
    SupportRequest.countDocuments(obj)
      .lean()
      .exec((err, total) => {
        count = Math.ceil(total / limit);
        next();
      });
  };

  const listRequests = (next) => {
    const skip = page * limit;
    const options = {
      limit,
      skip,
      sort,
    };
    SupportRequest.find(obj, null, options)
      .populate('member', 'name email phone code')
      .populate('category', 'name icon')
      .lean()
      .exec((err, results) => {
        if (err) {
          return next(err);
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: results,
          count,
          total: count * limit,
          page,
          limit,
        });
      });
  };

  const writeLog = (data, next) => {
    const logData = {
      user: userId,
      action: 'LIST_SUPPORT_REQUEST',
      description: 'Xem danh sách yêu cầu hỗ trợ',
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

  async.waterfall([checkParams, countRequests, listRequests, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('List support request error:', err);
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
