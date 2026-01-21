const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const PolicyDocumentModel = require('../../../../models/policyDocument');
const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  const {
    id,
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
  let updatedData = {};
  let oldData = {};

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Văn bản chính sách không tồn tại"
        }
      });
    }
    if (!documentName || !documentName.trim()) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập tên văn bản"
        }
      });
    }
    if (!issueDate) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Bạn chưa nhập ngày ban hành"
        }
      });
    }
    next();
  };

  const getOldData = (next) => {
    PolicyDocumentModel.findOne({ _id: id, status: 1 })
      .lean()
      .exec((err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Văn bản chính sách không tồn tại"
            }
          });
        }
        oldData = result;
        next();
      });
  };

  const updatePolicyDocument = (next) => {
    const obj = {
      documentName: documentName.trim(),
      nameAlias: change_alias(documentName),
      issueDate: new Date(issueDate),
      updatedAt: Date.now()
    };

    if (documentNumber) obj.documentNumber = documentNumber.trim();
    if (issueDateTo) obj.issueDateTo = new Date(issueDateTo);
    if (documentType) obj.documentType = documentType.trim();
    if (issuingAuthority) obj.issuingAuthority = issuingAuthority.trim();
    if (taxCategory) obj.taxCategory = taxCategory.trim();
    if (applicableObject) obj.applicableObject = applicableObject.trim();
    if (price !== undefined) obj.price = price;

    PolicyDocumentModel.findOneAndUpdate(
      { _id: id, status: 1 },
      obj,
      { new: true }
    ).exec((err, result) => {
      if (err) {
        return next(err);
      }
      if (!result) {
        return next({
          code: CONSTANTS.CODE.FAIL,
          message: {
            head: "Thông báo",
            body: "Cập nhật văn bản chính sách thất bại"
          }
        });
      }
      updatedData = result;
      next();
    });
  };

  const writeLog = (next) => {
    const logData = {
      user: userId,
      action: 'UPDATE_POLICY_DOCUMENT',
      description: 'Cập nhật văn bản chính sách',
      data: {
        policyDocumentId: id,
        oldData: oldData,
        updatedData: updatedData
      },
      createdAt: Date.now(),
    };

    SystemLogModel.create(logData, (err) => {
      if (err) {
        console.error('Error writing system log:', err);
      }
      next(null, {
        code: CONSTANTS.CODE.SUCCESS,
        data: updatedData
      });
    });
  };

  async.waterfall([checkParams, getOldData, updatePolicyDocument, writeLog], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
