const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const TaxDocumentModel = require('../../../../models/taxDocument');

module.exports = (req, res) => {
  const limit = req.body.limit || 100;
  const page = req.body.page || 0;
  const search = req.body.textSearch;
  const documentType = req.body.documentType;
  const issuingAuthority = req.body.issuingAuthority;
  const taxCategory = req.body.taxCategory;
  const fromDate = req.body.fromDate;
  const toDate = req.body.toDate;

  const checkParams = (next) => {
    next();
  };

  const listTaxDocument = (next) => {
    const query = {};

    // Search by document name or number
    if (search) {
      query.$or = [{ documentName: { $regex: search, $options: 'i' } }, { documentNumber: { $regex: search, $options: 'i' } }];
    }

    // Filter by document type
    if (documentType) {
      query.documentType = documentType;
    }

    // Filter by issuing authority
    if (issuingAuthority) {
      query.issuingAuthority = issuingAuthority;
    }

    // Filter by tax category
    if (taxCategory) {
      query.taxCategory = taxCategory;
    }

    // Filter by date range
    if (fromDate || toDate) {
      query.issueDate = {};
      if (fromDate) {
        query.issueDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.issueDate.$lte = new Date(toDate);
      }
    }

    TaxDocumentModel.find(query)
      .limit(limit)
      .skip(page * limit)
      .sort({ issueDate: -1, createdAt: -1 })
      .exec((err, result) => {
        if (err) {
          return next(err);
        }

        TaxDocumentModel.countDocuments(query, (countErr, total) => {
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

  async.waterfall([checkParams, listTaxDocument], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
