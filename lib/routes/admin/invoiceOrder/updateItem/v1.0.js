const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceOrderModel = require('../../../../models/invoiceOrder');
const InvoiceItemModel = require('../../../../models/invoiceItem');
const InvoiceOrderLogModel = require('../../../../models/invoiceOrderLog');

const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  
  const id = _.get(req, 'body.id', '');
  const supporterId = _.get(req, 'user.id', '');
  const status = _.get(req, 'body.status', '');
  const decisions = _.get(req, 'body.decisions', '');
  const fileURL = _.get(req, 'body.fileURL', '');
  const note = _.get(req, 'body.note', '');

  const checkParams = (next) => {
    if(!id || !supporterId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    next();
  }

  const getItem = (next) => {
    InvoiceItemModel
      .findOne({ _id: id })
      .populate('order', 'status')
      .exec((err, result) => {
        if(err) {
          return next(err);
        }

        if(!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.SYSTEM.ERROR
          });
        }

        if(!result.order) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Không tìm thấy thông tin hóa đơn liên quan',
            }
          });
        }

        if(result.order.status !== CONSTANTS.ORDER_STATUS.WAITING_RESULT) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Trạng thái của đơn hàng không hợp lệ để cập nhật kết quả',
            }
          });
        }

        next(null);
      });
  }

  const updateItem = (next) => {
    const updateData = {
      status,
      decisions,
      updatedAt: Date.now()
    };
    
    if(fileURL) {
      updateData['reference.file'] = fileURL;
    }
    if(note) {
      updateData['reference.note'] = note;
    }
    InvoiceItemModel
      .findOneAndUpdate(
        { _id: id },
        updateData,
        { new: true }
      )
      .exec((err, result) => {
        if(err) {
          return next(err);
        }

        if(!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.SYSTEM.ERROR
          });
        }

        // Log update item
        InvoiceOrderLogModel.logOrder({
          order: result.order,
          action: CONSTANTS.ORDER_LOG.UPDATE_ITEM,
          message: 'Cập nhật kết quả xử lý hóa đơn',
          supporter: supporterId,
          member: result.member
        });

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          message: {
            head: 'Thông báo',
            body: 'Cập nhật kết quả xử lý hóa đơn thành công',
          }
        });
      });
  }
  

  async.waterfall([checkParams, getItem, updateItem], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
