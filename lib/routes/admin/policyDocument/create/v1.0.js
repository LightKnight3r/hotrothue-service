const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const PolicyDocumentModel = require('../../../../models/policyDocument');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const {
    documentNumber,
    documentName,
    issueDate,
    issueDateTo,
    documentType,
    issuingAuthority,
    taxCategory,
    applicableObject,
    price
  } = req.body;
  const userId = _.get(req, 'user.id', '');
  let newPolicyDocument;

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

  const createPolicyDocument = (next) => {
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
    if (price !== undefined) obj.price = price;

    PolicyDocumentModel.create(obj, (err, result) => {
      if (err) {
        return next(err);
      }
      newPolicyDocument = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'CREATE_POLICY_DOCUMENT',
      description: 'Tạo mới văn bản chính sách',
      data: {
        policyDocumentId: newPolicyDocument._id,
        documentInfo: {
          documentNumber: newPolicyDocument.documentNumber,
          documentName: newPolicyDocument.documentName,
          issueDate: newPolicyDocument.issueDate,
          documentType: newPolicyDocument.documentType,
          price: newPolicyDocument.price
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
        data: newPolicyDocument,
      });
    });
  };

  async.waterfall([checkParams, createPolicyDocument, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
