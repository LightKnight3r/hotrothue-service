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
const regionRoutes = require('./lib/routes/region');
//Declare routes
// Authentication routes
declareRoute('post', '/login', [], userRoutes.login);
declareRoute('post', '/logout', [tokenToUserMiddleware], userRoutes.logout);
declareRoute('post', '/user/get', [tokenToUserMiddleware], userRoutes.get);

//region routes for admin user management
declareRoute('post', '/region/list', [], regionRoutes.list);

// crud user routes
declareRoute('post', '/admin/user/create', [tokenToUserMiddleware, validPermissionMiddleware('create_user')], adminUserRoutes.create);
declareRoute('post', '/admin/user/list', [tokenToUserMiddleware, validPermissionMiddleware('view_user')], adminUserRoutes.list);
declareRoute('post', '/admin/user/get', [tokenToUserMiddleware, validPermissionMiddleware('view_user')], adminUserRoutes.get);
declareRoute('post', '/admin/user/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_user')], adminUserRoutes.update);
declareRoute('post', '/admin/user/inactive', [tokenToUserMiddleware, validPermissionMiddleware('delete_user')], adminUserRoutes.inactive);
declareRoute('post', '/admin/user/active', [tokenToUserMiddleware, validPermissionMiddleware('delete_user')], adminUserRoutes.active);
declareRoute('post', '/admin/user/reset-password', [tokenToUserMiddleware, validPermissionMiddleware('reset_password')], adminUserRoutes.resetPassword);

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
