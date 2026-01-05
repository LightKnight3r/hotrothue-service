const socketIo = require('socket.io');
const _ = require('lodash');
const async = require('async');
const config = require('../../config/default.json');
const User = require('../models/user');
const LocalChat = require('../models/chat');
const redisConnections = require('../connections/redis');
const CONSTANTS = require('../const');

/**
 * Socket Manager cho hệ thống real-time chat
 * Quản lý connections và gửi messages trong local_conversation duy nhất
 */
class SocketChatManager {
  constructor() {
    this.io = null;
    this.mapUserToSocket = {};
    this.CONVERSATION_NAME = 'local_conversation';
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Xử lý đăng nhập
      socket.on('login', (data, cb) => {
        this.handleLogin(socket, data, cb);
      });

      // Xử lý ngắt kết nối
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Xử lý gửi tin nhắn
      socket.on('sendMessage', (data, cb) => {
        this.handleSendMessage(socket, data, cb);
      });

      // Xử lý đã xem tin nhắn
      socket.on('seenMessage', (data, cb) => {
        this.handleSeenMessage(socket, data, cb);
      });

      // Xử lý đang nhập tin nhắn
      socket.on('typingMessage', (data) => {
        this.handleTypingMessage(socket, data);
      });
    });
  }

  handleLogin(socket, data, cb) {
    if (typeof cb !== "function") cb = function() {};
    console.log('handleLogin:', data);

    const { token } = data;
    let userId;
    if (!token) {
      return cb({ code: CONSTANTS.CODE.WRONG_PARAMS });
    }

    redisConnections('master').getConnection().get(`user:${token}`, (err, result) => {
        if (err) {
            return cb({
                code: CONSTANTS.CODE.SYSTEM_ERROR
            });
        }

        if (!result) {
            return cb({
                code: CONSTANTS.CODE.TOKEN_EXPIRE
            });
        }

        try {
            const objSign = JSON.parse(result);
            if (!_.has(objSign, 'id')) {
                return cb({
                    code: CONSTANTS.CODE.TOKEN_EXPIRE
                });
            }
            userId = objSign.id;
            // Kiểm tra user tồn tại
            User.findById(userId)
              .lean()
              .exec((err, user) => {
                if (err || !user) {
                  return cb({ code: CONSTANTS.CODE.FAIL });
                }

                // Lưu thông tin user vào socket
                socket.userId = userId;
                socket.userInfo = user;
                
                // Join vào conversation duy nhất
                socket.join(this.CONVERSATION_NAME);
                
                // Lưu mapping user -> socket
                this.mapUserToSocket[userId] = socket;
                console.log(`User ${userId} connected with socket ${socket.id}`);
                console.log('Current online users:', Object.keys(this.mapUserToSocket));
                cb({ code: CONSTANTS.CODE.SUCCESS });
              });
        } catch (e) {
            return cb({
                code: CONSTANTS.CODE.TOKEN_EXPIRE
            });
        }
    });

    
  }

  handleDisconnect(socket, reason) {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    
    if (socket.userId) {
      delete this.mapUserToSocket[socket.userId];
      socket.leave(this.CONVERSATION_NAME);
    }
  }

  handleSendMessage(socket, data, cb) {
    if (typeof cb !== "function") cb = function() {};

    const { message = '', files } = data;
    if(!message.trim() && !files && files.length === 0) {
      return cb({ code: CONSTANTS.CODE.WRONG_PARAMS });
    }
    const currentTime = Date.now();
    console.log('handleSendMessage:', data, socket.userId);
    // Kiểm tra socket hợp lệ
    if (!socket || !socket.userId) {
      logger.logError([`Cannot connect to socket ${JSON.stringify(data)}`], 'on sendMessage');
      return cb({ code: CONSTANTS.CODE.SYSTEM_ERROR });
    }

    // Lưu tin nhắn vào database
    LocalChat.create({
      message: message,
      sender: socket.userId,
      createdAt: currentTime,
      files: files,
    }, (err, savedMessage) => {
      if (err) {
        logger.logError([err], 'Save message error');
        return cb({ code: CONSTANTS.CODE.SYSTEM_ERROR });
      }

      // Populate thông tin sender
      LocalChat.populate(savedMessage, { path: 'sender', select: 'name avatar' }, (err, populatedMessage) => {
        if (err) {
          logger.logError([err], 'Populate sender error');
          return cb({ code: CONSTANTS.CODE.SYSTEM_ERROR });
        }

        cb({
          code: CONSTANTS.CODE.SUCCESS,
          data: {
            message: populatedMessage
          }
        });

        // Gửi tin nhắn cho tất cả users khác trong conversation
        socket.to(this.CONVERSATION_NAME).emit('newMessage', {
          message: populatedMessage.message,
          files: populatedMessage.files,
          senderId: socket.userId,
          senderInfo: populatedMessage.sender,
          time: currentTime,
          id: populatedMessage._id.toString(),
          conversation: this.CONVERSATION_NAME
        });
      });
    });
  }

  handleSeenMessage(socket, data, cb) {
    if (typeof cb !== "function") cb = function() {};

    const { messageId } = data;

    if (!messageId || !socket.userId) {
      return cb({ code: CONSTANTS.CODE.WRONG_PARAMS });
    }

    // Tìm tin nhắn
    LocalChat.findById(messageId)
      .exec((err, message) => {
        if (err || !message) {
          return cb({ code: CONSTANTS.CODE.FAIL });
        }

        // Kiểm tra xem user đã đọc chưa
        const existingRead = message.memberReads.find(read => 
          read.id.toString() === socket.userId
        );

        if (existingRead) {
          return cb({ code: CONSTANTS.CODE.SUCCESS });
        }

        // Thêm user vào danh sách đã đọc
        message.memberReads.push({
          id: socket.userId,
          seenAt: Date.now()
        });

        message.save((err) => {
          if (err) {
            return cb({ code: CONSTANTS.CODE.SYSTEM_ERROR });
          }

          cb({ code: CONSTANTS.CODE.SUCCESS });

          // Thông báo cho các users khác về việc đã xem
          socket.to(this.CONVERSATION_NAME).emit('seenMessage', {
            messageId: messageId,
            userId: socket.userId,
            conversation: this.CONVERSATION_NAME
          });
        });
      });
  }

  handleTypingMessage(socket, data) {
    if (!socket.userId) return;

    // Gửi thông báo typing cho tất cả users khác
    socket.to(this.CONVERSATION_NAME).emit('typingMessage', {
      userId: socket.userId,
      userInfo: socket.userInfo,
      conversation: this.CONVERSATION_NAME
    });
  }

  // Utility methods
  getOnlineUsers() {
    return Object.keys(this.mapUserToSocket);
  }

  sendToUser(userId, event, data) {
    if (this.mapUserToSocket[userId]) {
      this.mapUserToSocket[userId].emit(event, data);
      return true;
    }
    return false;
  }

  broadcastToAll(event, data) {
    this.io.to(this.CONVERSATION_NAME).emit(event, data);
  }
}

module.exports = new SocketChatManager();
