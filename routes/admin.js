const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { checkAdmin } = require('../middleware/auth');

// Ensure all admin routes require admin privileges
router.use(checkAdmin);

// Admin dashboard
router.get('/', adminController.getAdminDashboard);

// User management - API endpoints
router.get('/api/users', adminController.getUsers);
router.get('/api/users/:id', adminController.getUserDetails);
router.post('/api/users/:id/subscription', adminController.updateUserSubscription);

// User management - UI page
router.get('/users', adminController.getUsersPage);

// Plan management - API endpoints
router.get('/api/plans', adminController.getPlans);
router.post('/api/plans', adminController.updatePlan);
router.post('/api/plans/new', adminController.createPlan);
router.delete('/api/plans/:id', adminController.deletePlan);

// System configuration - API endpoints
router.get('/api/config', adminController.getSystemConfig);
router.post('/api/config', adminController.updateSystemConfig);

// Music generations reporting - API endpoints
router.get('/api/generations', adminController.getMusicGenerations);

// Admin UI pages
router.get('/reports', adminController.getReportsPage);
router.get('/logs', adminController.getLogsPage);
router.get('/payments', adminController.getPaymentsPage);

// Configuration UI pages
router.get('/config/messages', adminController.getMessagesPage);
router.get('/config/plans', adminController.getPlansConfigPage);
router.get('/config/api', adminController.getApiConfigPage);

// Configuration form handling
router.post('/config/api', adminController.updateApiConfig);
router.post('/config/plans', adminController.updatePlansConfig);

module.exports = router;
