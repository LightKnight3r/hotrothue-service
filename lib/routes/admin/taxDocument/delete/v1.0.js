const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const TaxDocumentModel = require('../../../../models/taxDocument');

module.exports = (req, res) => {
  const { id } = req.body;

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    next();
  };

  const deleteTaxDocument = (next) => {
    TaxDocumentModel.deleteOne({ _id: id }, (err, result) => {
      if (err) {
        return next(err);
      }
      if (result.deletedCount === 0) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: "Thông báo",
            body: "Xóa văn bản thuế thất bại"
          }
        });
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        message: {
          head: "Thông báo",
          body: "Xóa văn bản thuế thành công"
        }
      });
    });
  };

  async.waterfall([checkParams, deleteTaxDocument], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
