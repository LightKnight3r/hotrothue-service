const mongoose = require('mongoose');
const config = require('config');
const Schema = mongoose.Schema;
const _ = require('lodash')
const mongoConnections = require('../connections/mongo')

const async = require('async');

const Config = new mongoose.Schema({
  type: {
    type: Number
  },
  region: {
    type: mongoose.Schema.Types.Mixed
  }
}, { id: false, versionKey: false, strict: false });

Config.statics.get = function (type, region, cb) {
  let config;
  const getConfigExactRegion = (next) => {
    if (!region) {
      return next();
    }

    this
      .findOne({
        type,
        'region.allow': region
      })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        config = result;

        next();
      })
  }

  const getDefaultConfig = (next) => {
    if (config) {
      return next();
    }

    const query = {
      type,
      'region.allow': 'all'
    }

    if (region) {
      query['region.deny'] = {
        $ne: region
      }
    }

    this
      .findOne(query)
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        config = result;

        next();
      })
  }

  async.waterfall([
    getConfigExactRegion,
    getDefaultConfig
  ], (err) => {
    if (err) {
      return cb(err);
    }

    cb(null, config);
  })
}

module.exports = mongoConnections('master').model('Config', Config);
