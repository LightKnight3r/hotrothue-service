const _ = require('lodash');
const async = require('async');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const SystemLogModel = require('../../../../models/systemLog');
const CONSTANTS = require('../../../../const');
const moment = require('moment');
const MESSAGES = require('../../../../message');

module.exports = (req, res) => {
  const startTime = _.get(req, 'body.startTime', moment().startOf('day').valueOf());
  const endTime = _.get(req, 'body.endTime', moment().endOf('day').valueOf());
  const userId = _.get(req, 'user.id', '');

  let filter = {
    action: 'CHARGE_MEMBER',
  };
  let userFilter = {
    action: 'CHARGE_MEMBER',
    user: userId,
  };

  let totalStatistic = {};
  let userStatistic = {};

  const checkParams = (next) => {
    // Filter theo khoảng thời gian cho cả 2 query
    const timeFilter = {
      $gte: startTime,
      $lte: endTime,
    };
    filter.createdAt = timeFilter;
    userFilter.createdAt = timeFilter;
    next();
  };

  const getTotalStatistic = (next) => {
    SystemLogModel.find(filter)
      .lean()
      .exec((err, logs) => {
        if (err) {
          return next(err);
        }

        let totalMoney = 0;
        let totalTransactions = logs.length;

        logs.forEach((log) => {
          const chargeAmount = _.get(log, 'data.chargeAmount', 0);
          totalMoney += chargeAmount;
        });

        totalStatistic = {
          totalMoney,
          totalTransactions,
        };

        next();
      });
  };

  const getUserStatistic = (next) => {
    SystemLogModel.find(userFilter)
      .lean()
      .exec((err, logs) => {
        if (err) {
          return next(err);
        }

        let userTotalMoney = 0;
        let userTotalTransactions = logs.length;

        logs.forEach((log) => {
          const chargeAmount = _.get(log, 'data.chargeAmount', 0);
          userTotalMoney += chargeAmount;
        });

        userStatistic = {
          totalMoney: userTotalMoney,
          totalTransactions: userTotalTransactions,
        };

        next();
      });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'VIEW_CHARGE_STATISTIC',
      description: 'Xem thống kê nạp tiền',
      data: {
        startTime,
        endTime,
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: {
          total: totalStatistic,
          user: userStatistic,
        },
      });
    });
  };

  async.waterfall([checkParams, getTotalStatistic, getUserStatistic, writeLog], (err, data) => {
    if (_.isError(err)) {
      console.error('Get charge statistic error:', err);
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
