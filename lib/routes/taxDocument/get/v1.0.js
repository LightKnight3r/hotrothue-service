const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocument = require('../../../models/taxDocument');

module.exports = (req, res) => {
  
  const _id = req.body._id || '';

  const checkParams = (next) => {
    if(!_id || (_id && !_.isString(_id))) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }

    next();
  }

  const getTaxDocument = (next) => {
    TaxDocument
      .findOne({
        _id: _id,
        status: 1
      })
      .lean()
      .exec((err, taxDocument) => {
        if(err) {
          return next(err);
        }

        if(!taxDocument) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.TAX_DOCUMENT.NOT_FOUND
          });
        }

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: taxDocument
        });
      });
  }

  async.waterfall([
    checkParams,
    getTaxDocument,
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
