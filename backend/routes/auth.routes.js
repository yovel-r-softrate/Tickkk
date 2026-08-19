const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/hrms.auth.middleware');
const { successResponse } = require('../utils/response');

/**
 * @swagger
 * /api/auth/me:
 *  get:
 *    tags:
 *      - Authentication
 *    summary: Get current user info from HRMS token
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: User info
 */
router.get('/me', auth, (req, res) => {
  // Return the decoded HRMS user object
  successResponse(res, 200, "User info retrieved", req.user);
});

module.exports = router;
