const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocument = require('../../../models/taxDocument');

module.exports = (req, res) => {
  res.json({
    code: CONSTANTS.CODE.SUCCESS,
    data: {
      documentTypes: CONSTANTS.TAX_DOCUMENT.DOCUMENT_TYPES,
      issuingAuthorities: CONSTANTS.TAX_DOCUMENT.ISSUING_AUTHORITIES,
      taxCategories: CONSTANTS.TAX_DOCUMENT.TAX_CATEGORIES,
      applicableObjects: CONSTANTS.TAX_DOCUMENT.APPLICABLE_OBJECTS,
    },
  })
};
