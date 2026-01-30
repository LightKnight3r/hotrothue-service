const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const SupportCategoryModel = require('../../../../models/supportCategory');
const SystemLogModel = require('../../../../models/systemLog');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = (req, res) => {
  const limit = Math.max(1, Math.min(100, _.get(req, 'body.limit', 10)));
  const page = Math.max(0, _.get(req, 'body.page', 0));
  const sort = _.get(req, 'body.sort', '-createdAt');
  const textSearch = _.get(req, 'body.textSearch', '');
  const status = _.get(req, 'body.status', null);
  const userId = _.get(req, 'user.id', '');
  let obj = {};
  let count = 0;

  const checkParams = (next) => {
    if (status !== null && status !== undefined && status !== '') {
      obj.status = parseInt(status);
    }

    if (textSearch && textSearch.trim()) {
      const $regex = escapeStringRegexp(textSearch.trim());
      obj['$or'] = [
        {
          name: {
            $regex,
            $options: 'gi',
          },
        },
        {
          description: {
            $regex,
            $options: 'gi',
          },
        },
      ];
    }
    next();
  };

  const countCategories = (next) => {
    SupportCategoryModel.countDocuments(obj)
      .lean()
      .exec((err, total) => {
        count = Math.ceil(total / limit);
        next();
      });
  };

  const listCategories = (next) => {
    const skip = page * limit;
    const options = {
      limit,
      skip,
      sort,
    };
    SupportCategoryModel.find(obj, null, options)
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
      action: 'LIST_SUPPORT_CATEGORY',
      description: 'Xem danh sách danh mục hỗ trợ',
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

  async.waterfall([checkParams, countCategories, listCategories, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('List support category error:', err);
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
