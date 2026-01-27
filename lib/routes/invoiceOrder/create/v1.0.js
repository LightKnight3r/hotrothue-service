const _ = require('lodash');
const async = require('async');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocumentModel = require('../../../models/taxDocument');
const InvoiceModel = require('../../../models/invoice');
const InvoiceOrderModel = require('../../../models/invoiceOrder');
const InvoiceOrderLogModel  = require('../../../models/invoiceOrderLog');
const InvoiceItemModel = require('../../../models/invoiceItem');
const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const ConfigModel = require('../../../models/config');

module.exports = (req, res) => {
  
  const userId = _.get(req, 'user.id', '');
  const type = _.get(req, 'body.type', '');
  const sourceFile = _.get(req, 'body.sourceFile',  '');
  const data = _.get(req, 'body.data', []);
  let inputTIN = [];
  let pricing = {};
  let price
  let items = [];

  const checkParams = (next) => {
    if(!userId || !type || !data.length) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: MESSAGES.SYSTEM.WRONG_PARAMS
      });
    }
    let resultSummary = {};
    req.body.code = generate('0123456789', 6)
    req.body.member = userId
    req.body._id = mongoose.Types.ObjectId();

    if(sourceFile) {
      req.body.sourceFile = sourceFile
    }
    next();
  }

  const handleCheckData = (next) => {
    // Kiểm tra TIN là trường bắt buộc
    for (let i = 0; i < data.length; i++) {
      if (!data[i].TIN || data[i].TIN.trim() === '') {
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: {
            head: 'Thông báo',
            body: `Dòng ${i + 1}: Vui lòng nhập Mã số thuế`
          },
          index: i
        });
      }
    }

    // Kiểm tra TIN không được trùng nhau
    const tinSet = new Set();
    const duplicateTINs = [];
    
    data.forEach((item, index) => {
      const tin = item.TIN.trim();
      if (tinSet.has(tin)) {
        duplicateTINs.push(tin);
      } else {
        tinSet.add(tin);
      }
    });

    if (duplicateTINs.length > 0) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: `Danh sách TIN không được trùng nhau. Vui lòng kiểm tra lại TIN: ${duplicateTINs.join(', ')}`
        },
        index: data.findIndex(item => item.TIN.trim() === duplicateTINs[0])
      });
    }

    // Lưu danh sách TIN để xử lý tiếp
    data.map((item) => {
      if(item.TIN) {
        inputTIN.push(item.TIN)
      }
    })
    req.body.inputTIN = inputTIN;
    next();
  }

  const getPricing = (next) => {
    ConfigModel
      .findOne({ type: CONSTANTS.CONFIG_TYPE.PRICING })
      .lean()
      .exec((err, config) => {
        if (err) {
          return next(err);
        }

        if (config && config.config && config.config.invoiceOrder) {
          price = config.config.invoiceOrder || 0;
        }

        pricing = {
          unitPrice: price,
          totalPrice: price * data.length,
          quantity: data.length
        }
        req.body.pricing = pricing;
        next(null);
      });
  }

  const createInvoiceItem = (next) => {
    async.eachSeries(data, (item, cbItem) => {
      let objCreate = {
        member: userId,
        order: req.body._id,
        TIN: item.TIN,
      };

      if(item.code) {
        objCreate.code = item.code
      }
      if(item.symbol) {
        objCreate.symbol = item.symbol
      }
      if(item.orderNumber) {
        objCreate.orderNumber = item.orderNumber
      }
      if(item.dateOfIssue) {
        objCreate.dateOfIssue = item.dateOfIssue
      }
      if(item.sellCompany) {
        objCreate.sellCompany = item.sellCompany
      }
      if(item.good) {
        objCreate.good = item.good
      }
      if(item.value) {
        objCreate.value = item.value
      }
      if(item.taxPercent) {
        objCreate.taxPercent = item.taxPercent
      }
      if(item.taxValue) {
        objCreate.taxValue = item.taxValue
      }
      if(item.totalValue) {
        objCreate.totalValue = item.totalValue
      }
      if(item.note) {
        objCreate.note = item.note
      }

      InvoiceModel  
        .findOne({
          tin: objCreate.TIN,
          status: 1
        })
        .lean()
        .exec((errFind, invoice) => {
          if (errFind) {
            return cbItem(errFind);
          }

          if (invoice) {
            objCreate.references = {
              invoice: invoice._id,
            }
            objCreate.decisions = [invoice.warning]
            if(!objCreate.sellCompany) {
              objCreate.sellCompany = invoice.companyName
            }
          }

          InvoiceItemModel
            .create(objCreate, (errCreate, result) => {
              if (errCreate) {
                return cbItem(errCreate);
              }
              items.push(result._id);
              cbItem();
            });
        })

      
    }, (errEach) => {
      if (errEach) {
        return next(errEach); 
      }

      req.body.items = items;
      next();
    });
  }

  const createInvoiceOrder = (next) => {
    InvoiceOrderModel
      .create(req.body, (errCreate, result) => {
        if (errCreate) {
          return next(errCreate);
        }

        InvoiceOrderLogModel
          .logOrder({
            order: result._id,
            action: CONSTANTS.ORDER_LOG.CREATE_ORDER,
            message: 'Tạo đơn hàng tra cứu hóa đơn',
            member: userId,
            data: result,
          })

        next(null, {
          code: CONSTANTS.CODE.SUCCESS,
          data: req.body._id
        });
      });
  }


  async.waterfall([
    checkParams,
    handleCheckData,
    getPricing,
    createInvoiceItem,
    createInvoiceOrder
  ], (err, data) => {
    if (_.isError(err)) {
      logger.logError([err], req.originalUrl, req.body);
      MailUtil.sendMail(`${req.originalUrl} - ${err} - ${JSON.stringify(req.body)}`);
    }
    
    err &&
      _.isError(err) &&
      (data = {
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: MESSAGES.SYSTEM.ERROR,
      });

    res.json(data || err);
  });
};
