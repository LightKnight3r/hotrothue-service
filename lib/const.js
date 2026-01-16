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
    TOPUP: 0
  },
  TAX_DOCUMENT: {
    DOCUMENT_TYPES: [
      'Hóa đơn GTGT',
      'Hóa đơn bán hàng',
      'Phiếu xuất kho kiêm vận chuyển hàng hóa',
      'Hóa đơn khác',
    ],
    ISSUING_AUTHORITIES: [
      'Cơ quan thuế',
      'Doanh nghiệp',
      'Tổ chức',
      'Cá nhân',
    ],
    TAX_CATEGORIES: [
      'Thuế GTGT',
      'Thuế TNCN',
      'Thuế TNDN',
      'Thuế khác',
    ],
    APPLICABLE_OBJECTS: [
      'Cá nhân',
      'Doanh nghiệp',
      'Tổ chức',
    ],
  },
};
