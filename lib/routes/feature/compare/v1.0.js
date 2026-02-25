const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const FeaturePolicyModel = require('../../../models/featurePolicy');
const FeatureModel = require('../../../models/feature');

module.exports = (req, res) => {

  const getFeatures = (next) => {
    FeatureModel
      .find({ status: 1 })
      .sort({ order: 1 })
      .lean()
      .exec((err, features) => {
        if (err) {
          return next(err);
        }

        next(null, features);
      });
  };

  const getFeaturePolicies = (features, next) => {
    FeaturePolicyModel
      .find({ scopeValue: { $in: ['FREE', 'MEMBER'] } })
      .lean()
      .exec((err, policies) => {
        if (err) {
          return next(err);
        }

        const freePolicy = policies.find(p => p.scopeValue === 'FREE');
        const memberPolicy = policies.find(p => p.scopeValue === 'MEMBER');

        next(null, features, freePolicy, memberPolicy);
      });
  };

  const compareFeatures = (features, freePolicy, memberPolicy, next) => {
    const result = features.map(feature => {
      const freeFeature = freePolicy?.features?.find(f => f.key === feature.key);
      const memberFeature = memberPolicy?.features?.find(f => f.key === feature.key);

      return {
        key: feature.key,
        displayName: feature.displayName,
        free: freeFeature?.access || 'none',
        member: memberFeature?.access || 'none'
      };
    });

    next(null, {
      code: CONSTANTS.CODE.SUCCESS,
      data: result
    });
  };

  async.waterfall([
    getFeatures,
    getFeaturePolicies,
    compareFeatures
  ], (err, data) => {
    if (_.isError(err)) {
      data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      };
    }

    res.json(data || err);
  });
};
