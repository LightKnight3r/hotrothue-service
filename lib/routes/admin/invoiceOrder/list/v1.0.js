const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceOrderModel = require('../../../../models/invoiceOrder');
const MemberModel = require('../../../../models/member');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  
  async.waterfall([checkParams, listInvoiceOrder], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });

  function checkParams(cb) {
    const { page, limit, textSearch } = req.body;
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    // Handle textSearch - search by phone (member) or order code
    if (textSearch) {
      // Try to find member by phone number
      MemberModel.findOne({ phone: textSearch }).lean().exec((err, member) => {
        if (err) {
          return cb(err);
        }

        // Build OR query for member and code
        const orConditions = [
          { code: textSearch }, 
          { inputTIN: textSearch }
        ];

        if (member) {
          orConditions.push({ member: member._id });
        }

        filter.$or = orConditions;

        continueWithFilters();
      });
    } else {
      continueWithFilters();
    }

    function continueWithFilters() {
      // Filter by supporter
      if (req.body.supporter) {
        filter.supporter = req.body.supporter;
      }

      // Filter by status
      if (req.body.status !== undefined) {
        const status = parseInt(req.body.status);
        if (!isNaN(status)) {
          filter.status = status;
        }
      }

      // Filter by payment status
      if (req.body.paymentStatus !== undefined) {
        const paymentStatus = parseInt(req.body.paymentStatus);
        if (!isNaN(paymentStatus)) {
          filter.paymentStatus = paymentStatus;
        }
      }

      // Filter by date range
      if (req.body.fromDate || req.body.toDate) {
        filter.createdAt = {};
        if (req.body.fromDate) {
          const fromDate = parseInt(req.body.fromDate);
          if (!isNaN(fromDate)) {
            filter.createdAt.$gte = fromDate;
          }
        }
        if (req.body.toDate) {
          const toDate = parseInt(req.body.toDate);
          if (!isNaN(toDate)) {
            filter.createdAt.$lte = toDate;
          }
        }
      }

      cb(null, { filter, skip, limit: limitNum, page: pageNum });
    }
  }

  function listInvoiceOrder(params, cb) {
    const { filter, skip, limit, page } = params;

    async.parallel({
      orders: (callback) => {
        InvoiceOrderModel.find(filter)
          .populate('member', 'name email phone')
          .populate('supporter', 'name email')
          .select('code type inputTIN paymentMethod paymentStatus status pricing supporter member updatedAt createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(callback);
      },
      total: (callback) => {
        InvoiceOrderModel.countDocuments(filter).exec(callback);
      }
    }, (err, results) => {
      if (err) {
        return cb(err);
      }

      cb(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: results.orders,
        pagination: {
          page,
          limit,
          total: results.total,
          totalPages: Math.ceil(results.total / limit)
        }
      });
    });
  }
};
