const _ = require('lodash');
const async = require('async');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const CONSTANTS = require('../../../const');
const MESSAGES = require('../../../message');
const TaxDocument = require('../../../models/taxDocument');
const logger = require('../../../logger');

module.exports = (req, res) => {
  
  const userId = _.get(req, 'user.id', '');
  const file = _.get(req, 'file', null);
  
  let invoiceData = [];
  let savedFilePath = '';
  let savedFileName = '';

  const checkParams = (next) => {
    if (!file) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Vui lòng tải lên file Excel chứa dữ liệu hóa đơn.'
        }
      });
    }

    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return next({
        code: CONSTANTS.CODE.WRONG_PARAMS,
        message: {
          head: 'Thông báo',
          body: 'Định dạng file không hợp lệ. Vui lòng tải lên file Excel với định dạng .xlsx hoặc .xls.'
        }
      });
    }
    
    next();
  }

  const parseExcelFile = (next) => {
    try {
      // Đọc file Excel
      const workbook = XLSX.readFile(file.path);
      
      // Lấy sheet đầu tiên
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Chuyển đổi sheet thành JSON, bắt đầu từ dòng 10
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: 9, // Bắt đầu từ dòng 10 (index 9)
        header: [
          'stt', // Cột A - Số thứ tự (bỏ qua)
          'code', // Cột B - Mã hóa đơn
          'symbol', // Cột C - Ký hiệu hóa đơn
          'orderNumber', // Cột D - Số hóa đơn
          'dateOfIssue', // Cột E - Ngày xuất hóa đơn
          'sellCompany', // Cột F - Doanh nghiệp bán
          'TIN', // Cột G - Mã số thuế
          'good', // Cột H - Hàng hóa dịch vụ
          'value', // Cột I - Giá trị mua
          'taxPercent', // Cột J - Thuế suất %
          'taxValue', // Cột K - Tiền thuế GTGT
          'totalValue', // Cột L - Tổng tiền
          'note' // Cột M - Ghi chú
        ],
        defval: '' // Giá trị mặc định cho ô trống
      });

      // Lọc và xử lý dữ liệu
      invoiceData = jsonData
        .filter(row => {
          // Bỏ qua các dòng không có TIN
          return row.TIN;
        })
        .map(row => {
          // Chuyển đổi ngày từ Excel serial date sang timestamp
          let dateOfIssue = row.dateOfIssue;
          if (typeof dateOfIssue === 'number') {
            // Excel serial date (số ngày từ 1/1/1900)
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateOfIssue - 2) * 24 * 60 * 60 * 1000);
            dateOfIssue = date.getTime();
          } else if (typeof dateOfIssue === 'string') {
            // Nếu là chuỗi, parse thành timestamp
            dateOfIssue = new Date(dateOfIssue).getTime();
          }

          return {
            code: String(row.code || '').trim(),
            symbol: String(row.symbol || '').trim(),
            orderNumber: String(row.orderNumber || '').trim(),
            dateOfIssue: dateOfIssue || Date.now(),
            sellCompany: String(row.sellCompany || '').trim(),
            TIN: String(row.TIN || '').trim(),
            good: String(row.good || '').trim(),
            value: parseFloat(row.value) || 0,
            taxPercent: parseFloat(row.taxPercent) || 0,
            taxValue: parseFloat(row.taxValue) || 0,
            totalValue: parseFloat(row.totalValue) || 0,
            note: String(row.note || '').trim()
          };
        });

      if (invoiceData.length === 0) {
        // Xóa file tạm nếu không có dữ liệu hợp lệ
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        return next({
          code: CONSTANTS.CODE.WRONG_PARAMS,
          message: 'File không có dữ liệu hợp lệ từ dòng 10 trở đi'
        });
      }

      // Lưu file vào thư mục public/uploads/invoice-order
      const uploadDir = path.join(__dirname, '../../../../public/uploads/invoice-order');
      
      // Tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Tạo tên file mới với timestamp
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      savedFileName = `invoice_${timestamp}${fileExtension}`;
      savedFilePath = path.join(uploadDir, savedFileName);

      // Copy file từ temp sang thư mục đích
      fs.copyFileSync(file.path, savedFilePath);
      
      // Xóa file tạm sau khi copy xong
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      next(null);
    } catch (error) {
      logger.logError(['parseExcelFile error:', error], req.originalUrl);
      
      // Xóa file tạm nếu có lỗi
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return next({
        code: CONSTANTS.CODE.SYSTEM_ERROR,
        message: {
          head: 'Thông báo',
          body: 'Đã có lỗi xảy ra khi phân tích file Excel. Vui lòng thử lại.'
        }
      });
    }
  }

  async.waterfall([
    checkParams,
    parseExcelFile
  ], (err, data) => {
    if (_.isError(err)) {
      logger.logError([err], req.originalUrl, req.body);
      MailUtil.sendMail(`${req.originalUrl} - ${err} - ${JSON.stringify(req.body)}`);
    }
    
    if (err) {
      return res.json(err);
    }

    // Tạo mảng TIN duy nhất
    const uniqueTINs = [...new Set(invoiceData.map(invoice => invoice.TIN))].filter(tin => tin);

    res.json({
      code: CONSTANTS.CODE.SUCCESS,
      message: 'Phân tích file thành công',
      data: {
        total: invoiceData.length,
        invoices: invoiceData,
        savedFile: {
          fileName: savedFileName,
          path: `/uploads/invoice-order/${savedFileName}`
        }
      }
    });
  });
};
