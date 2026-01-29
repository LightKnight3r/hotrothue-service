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
const adminTaxDocumentRoutes = require('./lib/routes/admin/taxDocument');
const adminInvoiceRoutes = require('./lib/routes/admin/invoice');
const adminPolicyDocumentRoutes = require('./lib/routes/admin/policyDocument');
const adminSupportRequestRoutes = require('./lib/routes/admin/supportRequest');
const adminInvoiceOrderRoutes = require('./lib/routes/admin/invoiceOrder');
const adminMembershipPackageRoutes = require('./lib/routes/admin/membershipPackage');
const adminSupportCategoryRoutes = require('./lib/routes/admin/supportCategory');

const regionRoutes = require('./lib/routes/region');

const MemberRoutes = require('./lib/routes/member');
const MemberTaxDocumentRoutes = require('./lib/routes/taxDocument');
const InvoiceOrderRoutes = require('./lib/routes/invoiceOrder');
const MembershipPackageRoutes = require('./lib/routes/membershipPackage');
const SupportRequestRoutes = require('./lib/routes/supportRequest');

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
declareRoute('post', '/admin/member/charge-history', [tokenToUserMiddleware, validPermissionMiddleware('charge_member')], adminMemberRoutes.history);
declareRoute('post', '/admin/member/charge-statistics', [tokenToUserMiddleware, validPermissionMiddleware('view_member')], adminMemberRoutes.statistic);

//crud permission routes
declareRoute('post', '/admin/permission/create', [tokenToUserMiddleware, validPermissionMiddleware('create_permission')], adminPermisstionRoutes.create);
declareRoute('post', '/admin/permission/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_permission')], adminPermisstionRoutes.delete);
declareRoute('post', '/admin/permission/get', [tokenToUserMiddleware, validPermissionMiddleware('get_permission')], adminPermisstionRoutes.get);
declareRoute('post', '/admin/permission/list', [tokenToUserMiddleware, validPermissionMiddleware('list_permission')], adminPermisstionRoutes.list);
declareRoute('post', '/admin/permission/groups', [tokenToUserMiddleware, validPermissionMiddleware('groups_permission')], adminPermisstionRoutes.groups);
declareRoute('post', '/admin/permission/list-by-group', [tokenToUserMiddleware, validPermissionMiddleware('list_by_group_permission')], adminPermisstionRoutes.listByGroup);
declareRoute('post', '/admin/permission/update', [tokenToUserMiddleware, validPermissionMiddleware('update_permission')], adminPermisstionRoutes.update);

//crud TaxDocument routes
declareRoute('post', '/admin/tax-document/create', [tokenToUserMiddleware, validPermissionMiddleware('create_tax_document')], adminTaxDocumentRoutes.create);
declareRoute('post', '/admin/tax-document/list', [tokenToUserMiddleware, validPermissionMiddleware('view_tax_document')], adminTaxDocumentRoutes.list);
declareRoute('post', '/admin/tax-document/get', [tokenToUserMiddleware, validPermissionMiddleware('view_tax_document')], adminTaxDocumentRoutes.get);
declareRoute('post', '/admin/tax-document/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_tax_document')], adminTaxDocumentRoutes.update);
declareRoute('post', '/admin/tax-document/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_tax_document')], adminTaxDocumentRoutes.delete);

//crud Invoice routes
declareRoute('post', '/admin/invoice/create', [tokenToUserMiddleware, validPermissionMiddleware('create_invoice')], adminInvoiceRoutes.create);
declareRoute('post', '/admin/invoice/list', [tokenToUserMiddleware, validPermissionMiddleware('view_invoice')], adminInvoiceRoutes.list);
declareRoute('post', '/admin/invoice/get', [tokenToUserMiddleware, validPermissionMiddleware('view_invoice')], adminInvoiceRoutes.get);
declareRoute('post', '/admin/invoice/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_invoice')], adminInvoiceRoutes.update);
declareRoute('post', '/admin/invoice/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_invoice')], adminInvoiceRoutes.delete);

//crud PolicyDocument routes
declareRoute('post', '/admin/policy-document/create', [tokenToUserMiddleware, validPermissionMiddleware('create_policy_document')], adminPolicyDocumentRoutes.create);
declareRoute('post', '/admin/policy-document/list', [tokenToUserMiddleware, validPermissionMiddleware('view_policy_document')], adminPolicyDocumentRoutes.list);
declareRoute('post', '/admin/policy-document/get', [tokenToUserMiddleware, validPermissionMiddleware('view_policy_document')], adminPolicyDocumentRoutes.get);
declareRoute('post', '/admin/policy-document/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_policy_document')], adminPolicyDocumentRoutes.update);
declareRoute('post', '/admin/policy-document/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_policy_document')], adminPolicyDocumentRoutes.delete);

// Admin Support Request routes
declareRoute('post', '/admin/support-request/list', [tokenToUserMiddleware, validPermissionMiddleware('view_support_request')], adminSupportRequestRoutes.list);
declareRoute('post', '/admin/support-request/get', [tokenToUserMiddleware, validPermissionMiddleware('view_support_request')], adminSupportRequestRoutes.get);
declareRoute('post', '/admin/support-request/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_support_request')], adminSupportRequestRoutes.update);
declareRoute('post', '/admin/support-request/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_support_request')], adminSupportRequestRoutes.delete);

// Admin Support Request routes
declareRoute('post', '/admin/support-request/list', [tokenToUserMiddleware, validPermissionMiddleware('view_support_request')], adminSupportRequestRoutes.list);
declareRoute('post', '/admin/support-request/get', [tokenToUserMiddleware, validPermissionMiddleware('view_support_request')], adminSupportRequestRoutes.get);
declareRoute('post', '/admin/support-request/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_support_request')], adminSupportRequestRoutes.update);
declareRoute('post', '/admin/support-request/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_support_request')], adminSupportRequestRoutes.delete);

// Admin Invoice Order routes
declareRoute('post', '/admin/invoice-order/list', [tokenToUserMiddleware, validPermissionMiddleware('view_invoice_order')], adminInvoiceOrderRoutes.list);
declareRoute('post', '/admin/invoice-order/get', [tokenToUserMiddleware, validPermissionMiddleware('view_invoice_order')], adminInvoiceOrderRoutes.get);
declareRoute('post', '/admin/invoice-order/accept', [tokenToUserMiddleware, validPermissionMiddleware('edit_invoice_order')], adminInvoiceOrderRoutes.accept);
declareRoute('post', '/admin/invoice-order/update-item', [tokenToUserMiddleware, validPermissionMiddleware('edit_invoice_order')], adminInvoiceOrderRoutes.updateItem);
declareRoute('post', '/admin/invoice-order/done', [tokenToUserMiddleware, validPermissionMiddleware('edit_invoice_order')], adminInvoiceOrderRoutes.done);

// Admin Membership Package routes
declareRoute('post', '/admin/membership-package/create', [tokenToUserMiddleware, validPermissionMiddleware('create_membership_package')], adminMembershipPackageRoutes.create);
declareRoute('post', '/admin/membership-package/list', [tokenToUserMiddleware, validPermissionMiddleware('view_membership_package')], adminMembershipPackageRoutes.list);
declareRoute('post', '/admin/membership-package/get', [tokenToUserMiddleware, validPermissionMiddleware('view_membership_package')], adminMembershipPackageRoutes.get);
declareRoute('post', '/admin/membership-package/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_membership_package')], adminMembershipPackageRoutes.update);
declareRoute('post', '/admin/membership-package/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_membership_package')], adminMembershipPackageRoutes.delete);

// Admin Support Category routes
declareRoute('post', '/admin/support-category/create', [tokenToUserMiddleware, validPermissionMiddleware('create_support_category')], adminSupportCategoryRoutes.create);
declareRoute('post', '/admin/support-category/list', [tokenToUserMiddleware, validPermissionMiddleware('view_support_category')], adminSupportCategoryRoutes.list);
declareRoute('post', '/admin/support-category/get', [tokenToUserMiddleware, validPermissionMiddleware('view_support_category')], adminSupportCategoryRoutes.get);
declareRoute('post', '/admin/support-category/update', [tokenToUserMiddleware, validPermissionMiddleware('edit_support_category')], adminSupportCategoryRoutes.update);
declareRoute('post', '/admin/support-category/delete', [tokenToUserMiddleware, validPermissionMiddleware('delete_support_category')], adminSupportCategoryRoutes.delete);

// Member routes
declareRoute('post', '/member/register', [], MemberRoutes.register);
declareRoute('post', '/member/login', [], MemberRoutes.login);
declareRoute('post', '/member/logout', [tokenToUserMiddleware], MemberRoutes.logout);
declareRoute('post', '/member/get', [tokenToUserMiddleware], MemberRoutes.get);
declareRoute('post', '/member/resend-verification-email', [], MemberRoutes.resendVerificationEmail);
declareRoute('post', '/member/verify-email', [], MemberRoutes.verifyEmail);
declareRoute('post', '/member/update-profile', [tokenToUserMiddleware], MemberRoutes.updateProfile);
declareRoute('post', '/member/forgot-password', [], MemberRoutes.forgotPassword);
declareRoute('post', '/member/reset-password', [], MemberRoutes.resetPassword);
declareRoute('post', '/member/change-password', [tokenToUserMiddleware], MemberRoutes.changePassword);

declareRoute('post', '/member/tax-document/list', [tokenToUserMiddleware], MemberTaxDocumentRoutes.list);
declareRoute('post', '/member/tax-document/get', [tokenToUserMiddleware], MemberTaxDocumentRoutes.get);
declareRoute('post', '/member/tax-document/get-config', [tokenToUserMiddleware], MemberTaxDocumentRoutes.getConfig);

// Invoice Order routes
declareRoute('post', '/member/invoice-order/convert-tin', [upload.single('file'), tokenToUserMiddleware], InvoiceOrderRoutes.convertTIN);
declareRoute('post', '/member/invoice-order/create', [tokenToUserMiddleware], InvoiceOrderRoutes.create);
declareRoute('post', '/member/invoice-order/list', [tokenToUserMiddleware], InvoiceOrderRoutes.list);
declareRoute('post', '/member/invoice-order/get', [tokenToUserMiddleware], InvoiceOrderRoutes.get);
declareRoute('post', '/member/invoice-order/pay-order', [], InvoiceOrderRoutes.payOrder);

// Membership Package routes
declareRoute('post', '/member/membership-package/list', [tokenToUserMiddleware], MembershipPackageRoutes.list);
declareRoute('post', '/member/membership-package/buy', [tokenToUserMiddleware], MembershipPackageRoutes.buy);

// Support Request routes
declareRoute('post', '/member/support-request/send', [tokenToUserMiddleware], SupportRequestRoutes.send);
declareRoute('post', '/member/support-request/list', [tokenToUserMiddleware], SupportRequestRoutes.list);
declareRoute('post', '/member/support-request/get', [tokenToUserMiddleware], SupportRequestRoutes.get);
declareRoute('post', '/member/support-request/list-category', [tokenToUserMiddleware], SupportRequestRoutes.listCategory);
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
