const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocumentModel = require('../../../models/taxDocument');
const InvoiceModel = require('../../../models/invoice');
const InvoiceOrderModel = require('../../../models/invoiceOrder');
const InvoiceItemModel = require('../../../models/invoiceItem');
const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const ConfigModel = require('../../../models/config');
const EightPayLog = require('../../../models/eightPayLog');
const PushNotifyManager = require('../../../jobs/pushNotify');

module.exports = (req, res) => {
  const invoiceOrderId = _.get(req, 'body.id', '');
  let orderInf
  let eightPayRef

  const checkParams = (next) => {
    if(!invoiceOrderId) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS
      })
    }
    next();
  }

  const checkOrderInf = (next) => {
    InvoiceOrderModel
      .findById(invoiceOrderId)
      .lean()
      .exec((err, result) => {

        if(err) {
          return next(err)
        }

        if(!result) {
          return next({
            code: CONSTANTS.CODE.FAIL
          })
        }
        if(result.status !== CONSTANTS.ORDER_STATUS.WAITING_PAYMENT) {
          return next({
            code: CONSTANTS.CODE.FAIL
          })
        }

        orderInf = result

        next();
      })
  }


  const checkAndHandlePaymentViaApp = (next) => {
    if(!orderInf.pricing.totalPrice) {
      return next();
    }

    const totalFeeCash = orderInf.pricing.totalPrice

    let memberInfo;

    const descreaseMoney = (done) => {
      MemberModel
        .findOneAndUpdate({
          _id: orderInf.member,
          money: {
            $gte: totalFeeCash
          }
        }, {
          $inc: {
            money: -totalFeeCash
          }
        })
        .exec((err, result) => {
          if(err) {
            return done(err);
          }

          if(!result) {
            return done({
              code: CONSTANTS.CODE.FAIL,
              message: {
                'head': 'Thông báo',
                'body': `Tài khoản số dư của bạn hiện không còn đủ ${totalFeeCash.toLocaleString().replace(/,/g, ".")}₫ để thanh toán cho đơn hàng. Vui lòng chọn loại thanh toán khác. Xin cảm ơn.`
              }
            })
          }

          memberInfo = result;

          done();
        })
    }

    const writeLogTransaction = (done) => {
      TransactionLogModel
        .create({
          member: orderInf.member,
          message: "Thanh toán tra cứu hóa đơn",
          data: {
            amount: -totalFeeCash,
            idOrder: orderInf._id,
            type: CONSTANTS.TRANSACTION_TYPE.PAY_INVOICE_ORDER,
            back: 0,
            initialMoney: memberInfo.money,
            finalMoney: memberInfo.money - totalFeeCash,
          }
        }, (err) => {
          done();
        })
    }

    async.waterfall([
      descreaseMoney,
      writeLogTransaction
    ], (err) => {
      if(err) {
        return next(err);
      }

      PushNotifyManager.sendToMember(orderInf.member, 'Thông báo', `Thanh toán đơn hàng thành công.`, {},'profile_update');

      next();
    })
  }


  const updateOrderInf = (next) => {
    let objUpdate = {
      status: CONSTANTS.ORDER_STATUS.PENDING_RECEIVE
    }
  
    if(eightPayRef) {
      objUpdate.eightPayRef = eightPayRef
      EightPayLog
        .update({
          _id: eightPayRef
        },{
          invoiceOrderId: orderInf._id
        },() =>{})
    }
    InvoiceOrderModel
      .update({
        _id: invoiceOrderId,
        status:  CONSTANTS.ORDER_STATUS.WAITING_PAYMENT
      },objUpdate,(err, result) => {
        if(err) {
          return next(err)
        }
        next()
      })

  }

  const addToProcess = (next) => {
    
    InvoiceOrderLogModel
      .logOrder({
        order: orderInf._id,
        action: CONSTANTS.ORDER_LOG.PAYMENT_SUCCESS,
        message: 'Thanh toán đơn hàng tra cứu hóa đơn thành công',
        member: orderInf.member
      })
    
    next(null,{
      code: CONSTANTS.CODE.SUCCESS,
      data: invoiceOrderId
    })
  }

  async.waterfall([
    checkParams,
    checkOrderInf,
    checkAndHandlePaymentViaApp,
    updateOrderInf,
    addToProcess
  ], (err, data) => {
    if(_.isError(err)) {
      logger.logError([err], req.originalUrl, req.body);
    }

    err && _.isError(err) && (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR
    });

    res.json(data || err);
  })
};
