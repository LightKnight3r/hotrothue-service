module.exports = {
  USER: {
    CREATE_SUCCESS: {
      head: 'Thông báo',
      body: 'Tài khoản của bạn đã được tạo thành công.',
    },
    UPDATE_SUCCESS: {
      head: 'Thông báo',
      body: 'Tài khoản của bạn đã được cập nhật thành công.',
    },
    EXISTS: {
      head: 'Thông báo',
      body: 'Tài khoản đã tồn tại.',
    },
    NOT_EXISTS: {
      head: 'Thông báo',
      body: 'Tài khoản không tồn tại.',
    },
    NOT_CHANGE: {
      head: 'Thông báo',
      body: 'Không có thay đổi nào được thực hiện.',
    },
    INCORRECT_PASSWORD: {
      head: 'Thông báo',
      body: 'Mật khẩu không chính xác. Vui lòng thử lại.',
    },
    TOKEN_EXPIRE: {
      head: 'Thông báo',
      body: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    },
    INACTIVE: {
      head: 'Thông báo',
      body: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
    },
    INVALID_PASSWORD: {
      head: 'Thông báo',
      body: 'Mật khẩu không hợp lệ.',
    },
    INVALID_NEW_PASSWORD: {
      head: 'Thông báo',
      body: 'Mật khẩu mới không hợp lệ.',
    },
    INVALID_REPASSWORD: {
      head: 'Thông báo',
      body: 'Mật khẩu nhập lại không hợp lệ.',  
    },
    PASSWORD_NOT_SAME: {
      head: 'Thông báo',
      body: 'Mật khẩu và mật khẩu nhập lại không giống nhau.',
    },
    PASSWORD_SAME:{
      head: 'Thông báo',
      body: 'Mật khẩu mới không được giống mật khẩu cũ.',
    },
    CHANGE_PASSWORD_SUCCESS: {
      head: 'Thông báo',
      body: 'Đổi mật khẩu thành công.',
    },
    ROLE_BLOCK: {
      head: 'Thông báo',
      body: 'Bạn không có quyền truy cập chức năng này. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
    }
  },
  NOTIFICATION: {
    IS_NOT_EXISTED: {
      head: 'Thông báo',
      body: 'Thông báo không tồn tại',
    },
    CREATE_SUCCESS: {
      head: 'Thông báo',
      body: 'Thêm mới thông báo thành công',
    },
    UPDATE_SUCCESS: {
      head: 'Thông báo',
      body: 'Chỉnh sửa thông báo thành công',
    },
    UPDATE_FAIL: {
      head: 'Thông báo',
      body: 'Chỉnh sửa thông báo thất bại',
    },
    INACTIVE_SUCCESS: {
      head: 'Thông báo',
      body: 'Xóa thông báo thành công',
    },
    INACTIVE_FAIL: {
      head: 'Thông báo',
      body: 'Xóa thông báo thất bại',
    },
    ACTIVE_SUCCESS: {
      head: 'Thông báo',
      body: 'Kích hoạt thông báo thành công',
    },
    ACTIVE_FAIL: {
      head: 'Thông báo',
      body: 'Kích hoạt thông báo thất bại',
    },
    PUSH_SUCCESS: {
      head: 'Thông báo',
      body: 'Đã gửi thông báo thành công',
    },
  },
 
  SYSTEM: {
    ERROR: {
      head: 'Thông báo',
      body: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    },
    WRONG_PARAMS: {
      head: 'Thông báo',
      body: 'Vui lòng kiểm tra lại thông tin và thử lại.',
    },
    SUCCESS: {
      head: 'Thông báo',
      body: 'Hoạt động đã được hoàn thành thành công.',
    },
  },
  FEEDBACK: {
    APPROVE_SUCCESS: {
      head: 'Thông báo',
      body: 'Phê duyệt phản hồi thành công',
    },
    APPROVE_FAIL: {
      head: 'Thông báo',
      body: 'Phê duyệt phản hồi thất bại',
    },
  },
  TAX_DOCUMENT: {
    NOT_FOUND: {
      head: 'Thông báo',
      body: 'Văn bản không tồn tại. Vui lòng kiểm tra lại.',
    }
  }
};
