const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const TaxDocumentModel = require('../../../../models/taxDocument');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const { documentNumber, documentName, issueDate, issueDateTo, documentType, issuingAuthority, taxCategory, applicableObject, url } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newTaxDocument;

  const checkParams = (next) => {
    if (!documentName || !documentName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập tên văn bản',
        },
      });
    }
    if (!issueDate) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Bạn chưa nhập ngày ban hành',
        },
      });
    }
    next();
  };

  const createTaxDocument = (next) => {
    const obj = {
      documentName: documentName.trim(),
      nameAlias: change_alias(documentName),
      issueDate: new Date(issueDate),
    };

    if (documentNumber) obj.documentNumber = documentNumber.trim();
    if (issueDateTo) obj.issueDateTo = new Date(issueDateTo);
    if (documentType) obj.documentType = documentType.trim();
    if (issuingAuthority) obj.issuingAuthority = issuingAuthority.trim();
    if (taxCategory) obj.taxCategory = taxCategory.trim();
    if (applicableObject) obj.applicableObject = applicableObject.trim();
    if (url) obj.url = url.trim();

    TaxDocumentModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newTaxDocument = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_TAX_DOCUMENT',
      description: 'Tạo mới văn bản thuế',
      data: {
        taxDocumentId: newTaxDocument._id,
        documentInfo: {
          documentNumber: newTaxDocument.documentNumber,
          documentName: newTaxDocument.documentName,
          issueDate: newTaxDocument.issueDate,
          documentType: newTaxDocument.documentType,
        },
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: newTaxDocument,
      });
    });
  };

  async.waterfall([checkParams, createTaxDocument, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
