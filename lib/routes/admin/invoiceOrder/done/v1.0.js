const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../../const');
const MESSAGES = require('../../../../message');
const InvoiceOrderModel = require('../../../../models/invoiceOrder');
const InvoiceOrderLogModel = require('../../../../models/invoiceOrderLog');

const SystemLogModel = require('../../../../models/systemLog');
const { change_alias } = require('../../../../utils/tool');

module.exports = (req, res) => {
  
  const id = _.get(req, 'body.id', '');
  const supporterId = _.get(req, 'user.id', '');

  const checkParams = (next) => {
    if(!id || !supporterId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    next();
  }

  const checkInvoiceOrder = (next) => {
    InvoiceOrderModel
      .findOne({
        _id: id
      })
      .populate('items')
      .lean()
      .exec((err, result) => {
        if(err) {
          return next(err);
        }

        if(!result) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Đơn hàng không tồn tại',
            }
          });
        }
        if(result.status !== CONSTANTS.ORDER_STATUS.WAITING_RESULT) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Trạng thái đơn hàng không hợp lệ',
            }
          });
        }
        if(!result.items || result.items.length === 0) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: MESSAGES.SYSTEM.ERROR
          });
        }

        let valid = true;
        _.forEach(result.items, (item) => {
          if(item.status !== CONSTANTS.ITEM_STATUS.DONE && item.status !== CONSTANTS.ITEM_STATUS.ERROR) {
            valid = false;
            return false;
          }
        });

        if(!valid) {
          return next({
            code: CONSTANTS.CODE.FAIL,
            message: {
              head: 'Thông báo',
              body: 'Chưa thể hoàn thành đơn hàng khi có thông tin doanh nghiệp chưa được xử lý xong',
            }
          });
        }

        next(null);
      });
  }

  const updateDone = (next) => {
    InvoiceOrderModel
      .findOneAndUpdate(
        { _id: id },
        {
          status: CONSTANTS.ORDER_STATUS.DONE,
          updatedAt: Date.now()
        },
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

        // Log done order
        InvoiceOrderLogModel.logOrder({
          order: id,
          action: CONSTANTS.ORDER_LOG.DONE_ORDER,
          message: 'Hoàn thành đơn hàng',
          supporter: supporterId,
          member: result.member
        });

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          message: {
            head: 'Thông báo',
            body: 'Hoàn thành đơn hàng thành công',
          }
        });
      });
  }

  async.waterfall([checkParams, checkInvoiceOrder, updateDone], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
