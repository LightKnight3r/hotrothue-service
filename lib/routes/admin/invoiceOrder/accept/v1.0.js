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

  const updateAcceptOrder = (next) => {
    InvoiceOrderModel
      .findOneAndUpdate(
        { _id: id, status: CONSTANTS.ORDER_STATUS.PENDING_RECEIVE },
        {
          status: CONSTANTS.ORDER_STATUS.WAITING_RESULT,
          supporter: supporterId,
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
            message: {
              head: 'Thông báo',
              body: 'Đơn hàng không tồn tại hoặc đã được tiếp nhận bởi người khác',
            }
          });
        }

        // Log accept order
        InvoiceOrderLogModel.logOrder({
          order: id,
          action: CONSTANTS.ORDER_LOG.ACCEPT_ORDER,
          message: 'Tiếp nhận đơn hàng',
          supporter: supporterId,
          member: result.member
        });

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          message: {
            head: 'Thông báo',
            body: 'Tiếp nhận yêu cầu thành công',
          }
        });
      });
  }

  async.waterfall([checkParams, updateAcceptOrder], (err, data) => {
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
