const express = require('express');
const cors = require('cors');
const { camelCaseToRouterCase, camelCaseToLodashCase } = require('./lib/utils/tool');
// Global variables
global._ = require('lodash');
global.config = require('config');
global.Logger = require('./lib/logger');
global.mongoose = require('mongoose');
global.fs = require('fs');
global.moment = require('moment');
global.async = require('async');
global.ms = require('ms');
global.MailUtil = require('./lib/utils/mail');
global.logger = Logger(`${__dirname}/logs`);
const multer = require('multer');
const upload = multer({
  dest: 'public/uploads',
});
// Load models
fs.readdirSync(`${__dirname}/lib/models`).forEach((file) => {
  global[_.upperFirst(_.camelCase(file.replace('.js', 'Model')))] = require(`./lib/models/${file}`);
});

// Middleware
const bodyParser = require('body-parser');
const tokenToUserMiddleware = require('./lib/middleware/tokenToUser');
const validPermissionMiddleware = require('./lib/middleware/verifyPermission');
const requireLevel2Verified = require('./lib/middleware/requireLevel2Verified');

// Start server
const app = express();
app.set('trust proxy', true);
const server = require('http').Server(app);

// Middleware setup
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));

// Define route declaration function
const declareRoute = (method, routeName, middlewares = [], destinationRoute) => {
  if (!destinationRoute || !routeName) {
    return;
  }

  Object.keys(destinationRoute).forEach((version) => {
    app[method](`/api/${version}${routeName}`, middlewares, destinationRoute[version]);
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

//Load routes
const userRoutes = require('./lib/routes/user');
const adminUserRoutes = require('./lib/routes/admin/user');
const adminMemberRoutes = require('./lib/routes/admin/member');
const adminPermisstionRoutes = require('./lib/routes/admin/permission');
const regionRoutes = require('./lib/routes/region');
//Declare routes
// Authentication routes
declareRoute('post', '/login', [], userRoutes.login);
declareRoute('post', '/logout', [tokenToUserMiddleware], userRoutes.logout);
declareRoute('post', '/user/get', [tokenToUserMiddleware], userRoutes.get);
declareRoute('post', '/user/change-password', [tokenToUserMiddleware], userRoutes.changePassword);

//region routes for admin user management
declareRoute('post', '/region/list', [], regionRoutes.list);

// crud user routes
declareRoute('post', '/admin/user/create', [tokenToUserMiddleware, validPermissionMiddleware('create_user')], adminUserRoutes.create);
declareRoute('post', '/admin/user/list', [tokenToUserMiddleware, validPermissionMiddleware('view_user')], adminUserRoutes.list);
declareRoute('post', '/admin/user/get', [tokenToUserMiddleware, validPermissionMiddleware('view_user')], adminUserRoutes.get);
declareRoute('post', '/admin/user/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_user')], adminUserRoutes.update);
declareRoute('post', '/admin/user/inactive', [tokenToUserMiddleware, validPermissionMiddleware('delete_user')], adminUserRoutes.inactive);
declareRoute('post', '/admin/user/active', [tokenToUserMiddleware, validPermissionMiddleware('active_user')], adminUserRoutes.activate);
declareRoute('post', '/admin/user/reset-password', [tokenToUserMiddleware, validPermissionMiddleware('reset_password')], adminUserRoutes.resetPassword);

//crud member routes
declareRoute('post', '/admin/member/list', [tokenToUserMiddleware, validPermissionMiddleware('view_member')], adminMemberRoutes.list);
declareRoute('post', '/admin/member/get', [tokenToUserMiddleware, validPermissionMiddleware('view_member')], adminMemberRoutes.get);
declareRoute('post', '/admin/member/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_member')], adminMemberRoutes.update);
declareRoute('post', '/admin/member/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_member')], adminMemberRoutes.delete);
declareRoute('post', '/admin/member/block', [tokenToUserMiddleware, validPermissionMiddleware('block_member')], adminMemberRoutes.block);
declareRoute('post', '/admin/member/charge', [tokenToUserMiddleware, validPermissionMiddleware('charge_member')], adminMemberRoutes.charge);
declareRoute('post', '/admin/member/history', [tokenToUserMiddleware, validPermissionMiddleware('charge_member')], adminMemberRoutes.history);

//crud permission routes
declareRoute('post', '/admin/permission/create', [tokenToUserMiddleware, validPermissionMiddleware('create_permission')], adminPermisstionRoutes.create);
declareRoute('post', '/admin/permission/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_permission')], adminPermisstionRoutes.delete);
declareRoute('post', '/admin/permission/get', [tokenToUserMiddleware, validPermissionMiddleware('get_permission')], adminPermisstionRoutes.get);
declareRoute('post', '/admin/permission/list', [tokenToUserMiddleware, validPermissionMiddleware('list_permission')], adminPermisstionRoutes.list);
declareRoute('post', '/admin/permission/groups', [tokenToUserMiddleware, validPermissionMiddleware('groups_permission')], adminPermisstionRoutes.groups);
declareRoute('post', '/admin/permission/list-by-group', [tokenToUserMiddleware, validPermissionMiddleware('list_by_group_permission')], adminPermisstionRoutes.listByGroup);
declareRoute('post', '/admin/permission/update', [tokenToUserMiddleware, validPermissionMiddleware('update_permission')], adminPermisstionRoutes.update);

// Start listening
const port = _.get(config, 'port', 3000);
server.listen(port, () => {
  logger.logInfo('Server listening at port:', port);
});

process.on('uncaughtException', (err) => {
  logger.logError('uncaughtException', err);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.logError('Unhandled Rejection at:', promise, 'reason:', reason);
});
