const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceModel = require('../../../../models/invoice');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const limit = req.body.limit || 10;
  const page = req.body.page || 0;
  const search = req.body.textSearch;
  const status = req.body.status;
  const fromDate = req.body.fromDate;
  const toDate = req.body.toDate;

  const checkParams = (next) => {
    if (limit > 50) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Số lượng bản ghi tối đa là 50',
        },
      });
    }
    next();
  };

  const listInvoice = (next) => {
    const query = {
      status: 1, // Chỉ lấy các bản ghi chưa xóa
    };

    // Search by company name or tin
    if (search) {
      query.$or = [{ companyName: { $regex: search, $options: 'gi' } }, { tin: { $regex: search, $options: 'gi' } }, { companyNameAlias: { $regex: change_alias(search), $options: 'gi' } }];
    }

    // Filter by status (nếu muốn xem cả bản ghi đã xóa)
    if (status !== undefined && status !== null) {
      query.status = status;
    }

    // Filter by close date range
    if (fromDate || toDate) {
      query.closeDate = {};
      if (fromDate) {
        query.closeDate.$gte = fromDate;
      }
      if (toDate) {
        query.closeDate.$lte = toDate;
      }
    }

    InvoiceModel.find(query)
      .limit(limit)
      .skip(page * limit)
      // .sort({ closeDate: -1, _id: -1 })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        InvoiceModel.countDocuments(query, (countErr, total) => {
          if (countErr) {
            return next(countErr);
          }
          next(null, {
            code: CONSTANTS.CODE.SUCCESS,
            data: result,
            total: total,
            page: page,
            limit: limit,
          });
        });
      });
  };

  async.waterfall([checkParams, listInvoice], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
