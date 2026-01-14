const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const Member = require('../../../../models/member');
const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');

const escapeStringRegexp = require('escape-string-regexp');

module.exports = (req, res) => {
  const limit = Math.max(1, Math.min(100, _.get(req, 'body.limit', 10))); // Giới hạn từ 1 đến 100
  const page = Math.max(0, _.get(req, 'body.page', 0));
  const sort = _.get(req, 'body.sort', '-createdAt'); // Mặc định sắp xếp theo thời gian tạo mới nhất
  const textSearch = _.get(req, 'body.textSearch', '');
  const status = _.get(req, 'body.status', null);
  const appName = _.get(req, 'body.appName', null);
  const userId = _.get(req, 'user.id', '');
  let obj = {};
  let count = 0;

  const checkParams = (next) => {
    // Filter by status
    if (status !== null && status !== undefined && status !== '') {
      obj.status = parseInt(status);
    }

    // Filter by appName
    if (appName && appName.trim()) {
      obj.appName = appName.trim();
    }

    // Text search
    if (textSearch && textSearch.trim()) {
      const $regex = escapeStringRegexp(textSearch.trim());
      obj['$or'] = [
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
        {
          'companyInfo.companyName': {
            $regex,
            $options: 'i',
          },
        },
        {
          'companyInfo.taxCode': {
            $regex,
            $options: 'i',
          },
        },
      ];
    }
    next();
  };

  const countMember = (next) => {
    Member.countDocuments(obj)
      .lean()
      .exec((err, total) => {
        count = Math.ceil(total / limit);
        next();
      });
  };

  const listMember = (next) => {
    const skip = page * limit;
    const options = {
      limit,
      skip,
      sort,
    };
    Member.find(obj, null, options)
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
      action: 'LIST_MEMBER',
      description: 'Xem danh sách thành viên',
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

  async.waterfall([checkParams, countMember, listMember, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('List member error:', err);
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
