module.exports = {
  CODE: {
    SUCCESS: 200,
    FAIL: 300,
    WRONG_PARAMS: 400,
    ACCESS_DENINED: 403,
    SYSTEM_ERROR: 500,
    TOKEN_EXPIRE: 1993,
    ROLE_BLOCK: 401,
  },
  USER_STATUS: {
    INACTIVE: 0,
    ACTIVE: 1,
  },
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
  },
  TRANSACTION: {
    TOPUP: 0,
    PAY_INVOICE_ORDER: 1,
  },
  CONFIG_TYPE:{
    PRICING: 0,
    PAYMENT_METHOD_INVOICE_ORDER: 1,
    PAYMENT_METHOD_CHARGING: 2
  },
  ORDER_STATUS: {
    WAITING_PAYMENT: 0, // Chờ thanh toán
    PENDING_RECEIVE: 1, // Đã thanh toán & Chờ tiếp nhận
    WAITING_RESULT: 2, // Đợi trả kết quả
    COMPLETED: 3, // Hoàn thành
    CANCELED: 4, // Đã hủy
    EXPIRED: 5 // Hết hạn
  },
  ORDER_LOG: {
    CREATE_ORDER: 0,
    PAYMENT_SUCCESS: 1,
    ACCEPT_ORDER: 2,
    DONE_ORDER: 3,
    CANCEL_ORDER: 4,
    TIMOUT_ORDER: 5,
    UPDATE_ITEM: 6
  },
  ITEM_STATUS:{
    PROCESSING:0, // Đang xử lý
    DONE: 1, // Hoàn thành
    ERROR: 2 // Lỗi
  },
  PAYMENT_STATUS: {
    UNPAID: 0, // chưa thanh toán
    PAID: 1, // đã thanh toán
    REFUNDED: 2, // đã hoàn tiền
    PARTIAL_REFUND: 3, // hoàn tiền một phần
    REFUNDING: 4 // đang hoàn tiền
  },
  TRANSACTION_TYPE: {
    TOPUP: 1,
    PAY_INVOICE_ORDER: 2,
    BUY_MEMBERSHIP_PACKAGE: 3
  },
  EIGHT_PAY_STATUS: {
    PENDING:0,
    SUCCESS: 1,
    FAIL: 2
  },
  DECISIONS: [
    "DN Đang hoạt động",
    "MST Không tồn tại",
    "DN có lịch sử bỏ địa chỉ KD",
    "DN ngừng hoạt động",
    "DN bị thu hồi MST"
  ],
  TAX_DOCUMENT: {
    DOCUMENT_TYPES: [
      'Luật',
      'Pháp lệnh',
      'Nghị quyết',
      'Nghị định',
      'Quyết định',
      'Chỉ thị',
      'Thông tư',
      'Văn bản hướng dẫn',
      'Văn bản khác',
    ],
    ISSUING_AUTHORITIES: [
      'Quốc hội',
      'Ủy ban thường vụ Quốc hội',
      'Chính phủ',
      'Thủ tướng Chính phủ',
      'Bộ Tài Chính',
      'Cục Thuế',
      'Bộ Công Thương',
      'Bộ Kế hoạch và Đầu tư',
      'Bộ Lao động thương binh và Xã hội',
      'Bộ Nội vụ',
      'Bộ Thương mại',
      'Cục thuế Tuyên Quang',
      'Hội đồng bộ trưởng',
      'Liên Bộ Công an - Tòa án nhân dân tối cao - Viện kiểm sát nhân dân tối cao - Tư pháp',
      'Liên Bộ Khoa học và Công nghệ - Tài chính - Công an',
      'Liên Bộ Kế hoạch và Đầu tư - Tài chính - Công an',
      'Liên Bộ Kế hoạch và Đầu tư - Tổng cục thống kê',
      'Liên Bộ Lao động thương binh và Xã hội - Tài chính',
      'Liên Bộ Nội vụ - Tài chính',
      'Liên Bộ Nội vụ - Tài chính - Lao động thương binh và Xã hội',
      'Liên Bộ Nội vụ - Văn phòng Chính phủ',
      'Liên Bộ Quốc phòng - Lao động thương binh và Xã hội - Tài chính',
      'Liên Bộ Thương mại - Giao thông vận tải - Tài chính - Công an',
      'Liên Bộ Tài chính - Bộ Nông nghiệp và Phát triển nông thôn',
      'Liên Bộ Tài chính - Công Thương - Công an',
      'Liên Bộ Tài chính - Công an',
      'Liên Bộ Tài chính - Công an - Quốc Phòng',
      'Liên Bộ Tài chính - Giao thông vận tải',
      'Liên Bộ Tài chính - Ngân hàng nhà nước',
      'Liên Bộ Tài chính - Quốc Phòng',
      'Liên Bộ Tài chính - Thanh tra Chính phủ',
      'Liên Bộ Tài chính - Thương mại',
      'Liên Bộ Tài chính - Thương mại - Công an',
      'Liên Bộ Tài chính - Tài nguyên môi trường',
      'Liên Bộ Tài chính - Tư pháp',
      'Liên Bộ Tài chính - Văn hóa Thông tin',
      'Liên Bộ Tài nguyên và Môi trường - Bộ Tài chính - Bộ Kế hoạch và Đầu tư',
      'Liên Bộ Y tế - Tài chính - Lao động thương binh và Xã hội',
      'Ngân hàng nhà nước',
      'Thanh tra Chính phủ',
      'Tổng cục thuế - Kho bạc nhà nước',
      'Liên Bộ Tài chính - Công Thương - Công An - Quốc Phòng',
    ],
    TAX_CATEGORIES: [
      'Luật Quản lý thuế',
      'Lệ phí trước bạ',
      'Phí, lệ phí',
      'Thuế Bảo vệ môi trường',
      'Thuế Sử dụng đất phi nông nghiệp',
      'Thuế chuyển quyền sử dụng đất',
      'Thuế giá trị gia tăng',
      'Thuế môn bài',
      'Thuế nhà đất',
      'Thuế sử dụng đất nông nghiệp',
      'Thuế thu nhập cá nhân',
      'Thuế thu nhập doanh nghiệp',
      'Thuế tiêu thụ đặc biệt',
      'Thuế tài nguyên',
      'Thuế xuất, nhập khẩu',
    ],
    APPLICABLE_OBJECTS: [
      'Chứng khoán',
      'Dầu khí',
      'Hiệp định thuế',
      'Hóa đơn chứng từ',
      'Khuyến khích đầu tư trong nước',
      'Kế toán kiểm toán',
      'Luật Quản lý thuế',
      'ODA',
      'Thuế cước',
      'Thuế nhà thầu',
      'Tự khai tự nộp',
      'Đầu tư nước ngoài',
      'Ưu đãi về thuế',
    ],
  },
};
