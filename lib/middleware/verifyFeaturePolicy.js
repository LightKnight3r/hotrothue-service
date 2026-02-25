const _ = require('lodash')
const redisConnections = require('../connections/redis')
const CONSTANTS = require('../const');
const MESSAGES = require('../message');
const async = require('async')
const config = require('config');
const FeaturePolicy = require('../models/featurePolicy');

module.exports = (allowPolicy) => {
  return async (req, res, next) => {
    const member = req.user;

    const tier = member.expiredTime > Date.now() ? 'MEMBER' : 'FREE';

    const policy = await FeaturePolicy.findOne({ scopeValue: tier }).lean();

    const f = policy.features.find(x => x.key === allowPolicy);
    if (!f || f.access === 'none') {
      return res.status(403).json({
        code: CONSTANTS.CODE.ACCESS_DENINED,
        message: {
          head: 'Thông báo',
          body: 'Tính năng này chỉ dành cho thành viên. Vui lòng nâng cấp tài khoản để sử dụng.',
        },
      });
    }

    next();
  }
}