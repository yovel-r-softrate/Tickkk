const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { auth, isAdmin } = require("../middleware/auth.middleware");

router.get("/", auth, userController.getUsers);
router.get("/organization", auth, userController.getUsersByOrganization);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user's profile
 *     description: Retrieve the profile of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/profile", auth, userController.getProfile);

module.exports = router;
