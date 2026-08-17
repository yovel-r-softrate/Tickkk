const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, isAdmin } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin } = require('../middleware/validate.middleware');

/**
 * @swagger
 * /api/auth/register:
 *  post:
 *    tags:
 *      - Authentication
 *    summary: Register a new user
 *    description: Creates a new user account
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - email
 *              - password
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *              password:
 *                type: string
 *                format: password
 *              organization:
 *                type: string
 *                description: Organization name to create or join
 *              createOrg:
 *                type: boolean
 *                description: If true, creates a new organization (user becomes admin)
 *    responses:
 *      201:
 *        description: User registered successfully
 *      400:
 *        description: User already exists
 *      500:
 *        description: Server error
 */
router.post('/register', validateRegister, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *  post:
 *    tags:
 *      - Authentication
 *    summary: Login user
 *    description: Authenticates a user and returns a JWT token
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - email
 *              - password
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *              password:
 *                type: string
 *                format: password
 *    responses:
 *      200:
 *        description: Login successful
 *      401:
 *        description: Invalid credentials
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */
router.post('/login', validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *  post:
 *    tags:
 *      - Authentication
 *    summary: Logout user
 *    description: Logs out the current user
 *    responses:
 *      200:
 *        description: User logged out
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/users:
 *  get:
 *    tags:
 *      - Authentication
 *    summary: Get all users
 *    description: Retrieves a list of all users
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: List of users
 *      500:
 *        description: Server error
 */
router.get('/users', auth, isAdmin, authController.getUsers);



module.exports = router;
