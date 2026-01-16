const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const TaxDocumentModel = require('../../../../models/taxDocument');
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
    url
  } = req.body;

  const checkParams = (next) => {
    if (!id) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: "Thông báo",
          body: "Văn bản thuế không tồn tại"
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

  const updateTaxDocument = (next) => {
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
    if (url) obj.url = url.trim();

    TaxDocumentModel.findOneAndUpdate(
      { _id: id },
      obj,
      { new: true },
      (err, result) => {
        if (err) {
          return next(err);
        }
        if (!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: "Thông báo",
              body: "Cập nhật văn bản thuế thất bại"
            }
          });
        }
        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: result
        });
      }
    );
  };

  async.waterfall([checkParams, updateTaxDocument], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
